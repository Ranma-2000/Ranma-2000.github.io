"""Differential-drive robot simulation backend.

Owns the pose-integration / ICC-arc kinematics and turn-mode detection for the
interactive simulation embedded in the portfolio site. The browser client is a
thin renderer: it only ever receives ready-to-draw numbers (pose, predicted
path endpoints, turn radius/center) over a WebSocket, never the formulas.
"""

import asyncio
import math

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

# --- Simulation constants (ported 1:1 from the original client-side script.js) ---
TRACK = 60.0                 # distance between the two drive wheels, in SVG px
HALF = TRACK / 2
SCALE = 40.0                 # sim-units -> SVG px
TRACK_SIM = TRACK / SCALE    # TRACK expressed in sim units
MAXSPD = 1.6                 # max linear speed at slider = 100
TICK_HZ = 30
DT = 1 / TICK_HZ
CANVAS_W, CANVAS_H, MARGIN = 680.0, 420.0, 40.0
PREVIEW_TIME = 4.0
MAX_ARC = math.pi * 1.95
EPS_DIFF = 0.5

DEFAULT_POSE = {"x": 340.0, "y": 210.0, "theta": -math.pi / 2}


def clamp(value, lo, hi):
    return max(lo, min(hi, value))


def to_rad(v_slider):
    return (v_slider / 100.0) * MAXSPD


def compute_motion(vl, vr):
    v = (vl + vr) / 2
    w = (vl - vr) / TRACK_SIM
    return v, w


def step_pose(pose, v, w, dt):
    if abs(w) < 1e-5:
        pose["x"] += v * math.cos(pose["theta"]) * dt * SCALE
        pose["y"] += v * math.sin(pose["theta"]) * dt * SCALE
    else:
        R = v / w
        dtheta = w * dt
        cx = pose["x"] - R * SCALE * math.sin(pose["theta"])
        cy = pose["y"] + R * SCALE * math.cos(pose["theta"])
        new_theta = pose["theta"] + dtheta
        pose["x"] = cx + R * SCALE * math.sin(new_theta)
        pose["y"] = cy - R * SCALE * math.cos(new_theta)
        pose["theta"] = new_theta

    pose["x"] = clamp(pose["x"], MARGIN, CANVAS_W - MARGIN)
    pose["y"] = clamp(pose["y"], MARGIN, CANVAS_H - MARGIN)


def compute_mode(pose, vl_raw, vr_raw, v, w):
    """Returns (mode, fixed_wheel, center, radius)."""
    mode = "straight"
    if abs(vr_raw - vl_raw) > EPS_DIFF:
        if vl_raw == 0 or vr_raw == 0:
            mode = "wheel"
        elif (
            (vl_raw > 0) != (vr_raw > 0)
            and abs(vl_raw + vr_raw) < EPS_DIFF * 2
            and abs(vl_raw) > 1
        ):
            mode = "pivot"
        else:
            mode = "arc"

    if mode == "straight":
        return mode, None, None, None

    radius = abs(v / w) if abs(w) > 0.01 else None
    fixed_wheel = None

    if mode == "pivot":
        cx, cy = pose["x"], pose["y"]
        radius = 0.0
    elif mode == "wheel":
        fixed_wheel = "left" if vl_raw == 0 else "right"
        if fixed_wheel == "left":
            cx = pose["x"] + HALF * math.sin(pose["theta"])
            cy = pose["y"] - HALF * math.cos(pose["theta"])
        else:
            cx = pose["x"] - HALF * math.sin(pose["theta"])
            cy = pose["y"] + HALF * math.cos(pose["theta"])
    else:  # arc
        R = (v / w) * SCALE
        cx = pose["x"] - R * math.sin(pose["theta"])
        cy = pose["y"] + R * math.cos(pose["theta"])

    return mode, fixed_wheel, {"x": cx, "y": cy}, radius


def compute_predicted(pose, vl_raw, vr_raw, v, w):
    if abs(vl_raw) < 0.5 and abs(vr_raw) < 0.5:
        return None

    if abs(w) < 1e-5:
        length = v * PREVIEW_TIME * SCALE
        ex = pose["x"] + length * math.cos(pose["theta"])
        ey = pose["y"] + length * math.sin(pose["theta"])
        return {"type": "line", "x1": pose["x"], "y1": pose["y"], "x2": ex, "y2": ey}

    R = v / w
    rpx = R * SCALE
    icx = pose["x"] - rpx * math.sin(pose["theta"])
    icy = pose["y"] + rpx * math.cos(pose["theta"])

    dtheta = clamp(w * PREVIEW_TIME, -MAX_ARC, MAX_ARC)
    end_theta = pose["theta"] + dtheta
    radius = abs(rpx)
    ex = icx + rpx * math.sin(end_theta)
    ey = icy - rpx * math.cos(end_theta)

    large_arc = 1 if abs(dtheta) > math.pi else 0
    sweep = 1 if dtheta > 0 else 0

    return {
        "type": "arc",
        "x1": pose["x"], "y1": pose["y"],
        "x2": ex, "y2": ey,
        "radius": radius,
        "largeArc": large_arc,
        "sweep": sweep,
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.websocket("/ws")
async def simulate(websocket: WebSocket):
    await websocket.accept()

    pose = dict(DEFAULT_POSE)
    inputs = {"vl": 60.0, "vr": 60.0}

    async def receiver():
        while True:
            msg = await websocket.receive_json()
            msg_type = msg.get("type")
            if msg_type == "input":
                inputs["vl"] = clamp(float(msg.get("vl", 0)), -100, 100)
                inputs["vr"] = clamp(float(msg.get("vr", 0)), -100, 100)
            elif msg_type == "reset":
                pose.update(DEFAULT_POSE)

    async def ticker():
        while True:
            await asyncio.sleep(DT)

            vl_raw, vr_raw = inputs["vl"], inputs["vr"]
            vl, vr = to_rad(vl_raw), to_rad(vr_raw)
            v, w = compute_motion(vl, vr)
            moving = abs(vl_raw) > 0.5 or abs(vr_raw) > 0.5

            if moving:
                step_pose(pose, v, w, DT)

            mode, fixed_wheel, center, radius = compute_mode(pose, vl_raw, vr_raw, v, w)
            predicted = compute_predicted(pose, vl_raw, vr_raw, v, w)

            await websocket.send_json({
                "type": "tick",
                "pose": pose,
                "v": v,
                "w": w,
                "mode": mode,
                "fixedWheel": fixed_wheel,
                "center": center,
                "radius": radius,
                "predicted": predicted,
                "moving": moving,
            })

    recv_task = asyncio.create_task(receiver())
    tick_task = asyncio.create_task(ticker())

    done, pending = await asyncio.wait(
        {recv_task, tick_task}, return_when=asyncio.FIRST_COMPLETED
    )
    for task in pending:
        task.cancel()
    for task in done | pending:
        try:
            await task
        except (WebSocketDisconnect, asyncio.CancelledError, Exception):
            pass
