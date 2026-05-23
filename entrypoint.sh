#!/bin/sh
# Fix permissions on /data volume (Railway mounts it as root)
mkdir -p /data
chown -R nextjs:nodejs /data
# Switch to nextjs user and start the app
exec su-exec nextjs node server.js
