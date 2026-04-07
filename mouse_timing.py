#!/usr/bin/env python3
"""
Mouse Click Timing Recorder
Records: hold duration, delay between clicks
Press ESC or Ctrl+C to stop and save results.
"""

import time
import json
from pynput import mouse, keyboard

events = []
current_press = {}
last_release_time = None
running = True


def on_click(x, y, button, pressed):
    global last_release_time

    now = time.perf_counter()
    btn = str(button).split(".")[-1]  # e.g. "left", "right"

    if pressed:
        delay_since_last = None
        if last_release_time is not None:
            delay_since_last = round((now - last_release_time) * 1000, 3)

        current_press[btn] = {
            "button": btn,
            "press_time": now,
            "delay_before_ms": delay_since_last,
        }

        print(f"  ↓ [{btn}] pressed", end="")
        if delay_since_last is not None:
            print(f"  |  gap since last release: {delay_since_last} ms", end="")
        print()

    else:
        if btn in current_press:
            hold_ms = round((now - current_press[btn]["press_time"]) * 1000, 3)
            entry = {
                "button": btn,
                "hold_ms": hold_ms,
                "delay_before_ms": current_press[btn]["delay_before_ms"],
            }
            events.append(entry)
            last_release_time = now

            print(f"  ↑ [{btn}] released  |  held for: {hold_ms} ms")
            del current_press[btn]


def on_press(key):
    global running
    if key == keyboard.Key.esc:
        running = False
        return False  # stop listener


def main():
    print("=" * 55)
    print("  Mouse Click Timing Recorder")
    print("=" * 55)
    print("  Click away! Press ESC to stop and save results.\n")

    kb_listener = keyboard.Listener(on_press=on_press)
    kb_listener.start()

    with mouse.Listener(on_click=on_click) as m_listener:
        kb_listener.join()
        m_listener.stop()

    # ── Summary ────────────────────────────────────────────
    print("\n" + "=" * 55)
    print(f"  Recorded {len(events)} click(s)")

    if events:
        holds = [e["hold_ms"] for e in events]
        gaps  = [e["delay_before_ms"] for e in events if e["delay_before_ms"] is not None]

        print(f"\n  Hold duration  (ms):")
        print(f"    min  : {min(holds):.3f}")
        print(f"    max  : {max(holds):.3f}")
        print(f"    avg  : {sum(holds)/len(holds):.3f}")

        if gaps:
            print(f"\n  Gap between clicks (ms):")
            print(f"    min  : {min(gaps):.3f}")
            print(f"    max  : {max(gaps):.3f}")
            print(f"    avg  : {sum(gaps)/len(gaps):.3f}")

        # Save raw data
        out_file = "mouse_timings.json"
        with open(out_file, "w") as f:
            json.dump(events, f, indent=2)
        print(f"\n  Raw data saved → {out_file}")

    print("=" * 55)


if __name__ == "__main__":
    main()