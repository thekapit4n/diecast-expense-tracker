# Running the mobile app on your iPhone

The app is signed with a **free/personal Apple ID**, so it needs to be
re-installed about **every 7 days** (the signature expires — your data is safe,
only the app stops opening). Re-running the command below resets the 7-day
clock.

## Renew / run the app (the weekly step)

1. **Plug the iPhone into the Mac** with a cable, **unlock it**, and keep it
   unlocked.
2. Open the **Terminal** app (Cmd+Space → type "Terminal" → Enter).
3. Go to the mobile folder:
   ```bash
   cd "/Users/haiqalhalim/Documents/Urusan Kerja Haiqal/diecast-expense-tracker/mobile"
   ```
4. Run the app on the phone:
   ```bash
   flutter run --release -d "Eiqal phone"
   ```
   (Flutter matches the phone by name — no long device ID needed.)
5. Wait ~1–2 minutes. When you see `Flutter run key commands.`, it's installed.
6. Press **`q`** in the terminal to quit the session. The app stays installed and
   runs on its own — you can unplug the cable.

## Tips

- **List connected devices** (if the name changes):
  ```bash
  flutter devices
  ```
  Use whatever name/ID shows for the iPhone after `-d`.

- **"Untrusted developer" / won't launch** — happens after a 7-day expiry or an
  uninstall. On the phone: **Settings → General → VPN & Device Management →**
  tap the Apple Development profile → **Verify App** (needs internet; if it
  spins, switch to cellular data). Then re-run step 4.

- **Debug vs release** — always use `--release`. Debug builds cannot be launched
  from the home screen on iOS 14+ (they only run while tethered to Flutter).

- **Do not interrupt** the command while it says `Installing and launching…` —
  cancelling mid-install can corrupt the install and force an uninstall +
  re-trust.

## Longer-term options (no weekly renewal)

- **Paid Apple Developer account** (~USD 99/year): apps last a full year.
- **TestFlight**: install over the air without a cable (needs the paid account).
