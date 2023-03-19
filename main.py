import os
import sys
import shutil

import threading
import asyncio
import server.server as server

async def run(server, address='', port=8188, verbose=True, call_on_start=None):
    await asyncio.gather(server.start(address, port, verbose, call_on_start), server.publish_loop())

if __name__ == "__main__":

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    server = server.PromptServer(loop)
    address = '127.0.0.1'
    port = 8188
    dont_print = False
    call_on_start = None

    if os.name == "nt":
        try:
            loop.run_until_complete(run(server, address=address, port=port, verbose=not dont_print, call_on_start=call_on_start))
        except KeyboardInterrupt:
            pass
    else:
        loop.run_until_complete(run(server, address=address, port=port, verbose=not dont_print, call_on_start=call_on_start))