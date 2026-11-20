#!/usr/bin/env python3
"""Loopback-only bridge: Docker suppresses published ports on --internal.
No container network additions; no Internet access; forwards only lab HTTP.
"""
import socket, socketserver, subprocess, json, threading
info=json.loads(subprocess.check_output(['docker','inspect','mapos5-orcamento-lab-php']))[0]
net=info['NetworkSettings']['Networks']
assert list(net)==['mapos5-orcamento-lab-net']
TARGET=(net['mapos5-orcamento-lab-net']['IPAddress'],8000)
class Handler(socketserver.BaseRequestHandler):
 def handle(self):
  with socket.create_connection(TARGET,10) as upstream:
   def pump(a,b):
    try:
     while data:=a.recv(65536): b.sendall(data)
    except OSError: pass
    finally:
     try: b.shutdown(socket.SHUT_WR)
     except OSError: pass
   t=threading.Thread(target=pump,args=(self.request,upstream),daemon=True);t.start();pump(upstream,self.request);t.join(timeout=10)
class Server(socketserver.ThreadingTCPServer):
 allow_reuse_address=True
 daemon_threads=True
with Server(('127.0.0.1',8230),Handler) as server:
 print('Lab loopback HTTP bridge listening on 127.0.0.1:8230',flush=True)
 server.serve_forever()
