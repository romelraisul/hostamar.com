# WSL ssh.socket "Result: resources" — FIXED
Date: 2026-10-10 01:35 +06
Host: DESKTOP-9KA03CQ — Ubuntu on WSL2, user romel

## BEFORE
  ssh.socket failed at every boot since 2026-10-08 (Result: resources), 0 listeners on :22.
  `sudo systemctl restart ssh.socket` -> "Job failed. See journalctl -xe for details."
  kvm-access.service also failed at boot (its chmod 666 /dev/kvm raced device creation)
  -> disabled; harmless (romel is in the kvm group, /dev/kvm is rw).
  The symptom appeared on the same boot that .wslconfig gained `networkingMode=mirrored`
  (V80, 2026-10-08). Every boot before that was clean.

## ROOT CAUSE — confirmed, not inferred
  Windows OpenSSH is running: Get-Service sshd = Running, PID 5724, holding
      TCP  0.0.0.0:22  LISTENING  5724
      TCP  [::]:22     LISTENING  5724
  /usr/lib/systemd/system/ssh.socket ships:
      [Socket]
      ListenStream=0.0.0.0:22
      ListenStream=[::]:22
      BindIPv6Only=ipv6-only
      Accept=no
      FreeBind=yes

  WSL2 `networkingMode=mirrored` puts Windows and the WSL VM in ONE network stack, so the
  Windows :22 listener occupies the same address the WSL socket tries to bind ->
  bind(0.0.0.0:22) returns EADDRINUSE -> systemd fails the whole unit -> `Result: resources`.

  NOT a WSL limitation, NOT AppArmor/SELinux, NOT sshd_config, NOT a missing user.
  Note the trap: `ss -tln` INSIDE WSL shows nothing on :22 (only Windows holds it, on the
  other side of the shared stack), which makes it look like "nothing is using port 22".

## FIX — move WSL's sshd off the port Windows owns (capability preserved)
  /etc/systemd/system/ssh.socket.d/override.conf
      [Socket]
      ListenStream=
      ListenStream=0.0.0.0:2222
      ListenStream=[::]:2222
      BindIPv6Only=ipv6-only

  Applied via root without a password: `wsl.exe -u root -- bash -c "..."`
  then `systemctl daemon-reload && systemctl reset-failed ssh.socket && systemctl restart ssh.socket`.

  Why not "disable it, WSL doesn't need incoming SSH":
  /home/romel/.ssh/authorized_keys holds 2 keys and tailscale is installed here, so SSH into
  this WSL box is a live capability (GitHub Actions reaches it over tailscale). Disabling would
  have silently removed a working thing. Disabling stays available and reversible:
      sudo systemctl disable --now ssh.socket ssh.service

  Why BOTH ListenStream lines — the gotcha that cost a second attempt:
  the unit sets `BindIPv6Only=ipv6-only`, so a bare `ListenStream=2222` binds IPv6 ONLY.
  That first attempt came up `[::]:2222 v6only:1` and refused 127.0.0.1:2222.

## AFTER — verified live
  systemctl status ssh.socket -> active (running); Listen: 0.0.0.0:2222 + [::]:2222
  systemctl is-enabled ssh.socket ssh.service kvm-access.service -> enabled / enabled / disabled
  systemctl --failed -> "0 loaded units listed"
  ssh -p 2222 romel@127.0.0.1        -> SSH_OK_V4        (DESKTOP-9KA03CQ)
  ssh -p 2222 romel@::1              -> SSH_OK_V6
  ssh -p 2222 romel@100.71.153.110   -> SSH_OK_TAILSCALE (tailscale IP, the remote/CI path)
  Windows side: Test-NetConnection 127.0.0.1 -Port 2222 -> True (mirrored mode: Windows reaches WSL)
  Nothing on :22 inside WSL; Windows sshd keeps :22 untouched.

## FOR ANY SCRIPT / CI
  SSH into this WSL box is now port 2222, not 22. Windows-side SSH is unchanged (:22, Windows sshd).
  Cold-boot equivalence was not exercised (rebooting WSL would kill the working session); the
  drop-in is read on every systemd start, which is the same code path as the live restart.
