#!/bin/bash
# Keep container alive for Claude Code to exec into.
sleep infinity &
wait $!
