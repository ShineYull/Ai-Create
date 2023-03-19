import os
import asyncio
import aiohttp
from aiohttp import web
import mimetypes
import server.nodes as nodes

@web.middleware
async def cache_control(request: web.Request, handler):
    response: web.Response = await handler(request)
    if request.path.endswith('.js') or request.path.endswith('.css'):
        response.headers.setdefault('Cache-Control', 'no-cache')
    return response

class PromptServer():
    def __init__(self, loop):
        mimetypes.init(); 
        mimetypes.types_map['.js'] = 'application/javascript; charset=utf-8'
        self.prompt_queue = None
        self.loop = loop
        self.messages = asyncio.Queue()
        self.number = 0
        self.app = web.Application(client_max_size=20971520, middlewares=[cache_control])
        self.sockets = dict()
        self.web_root = os.path.join(os.path.dirname(
            os.path.realpath(__file__)), "../web")
        routes = web.RouteTableDef()
        self.last_node_id = None
        self.client_id = None

        @routes.get("/")
        async def get_root(request):
            return web.FileResponse(os.path.join(self.web_root, "index.html"))
    
        @routes.get("/object_info")
        async def get_object_info(request):
            out = {}
            for x in nodes.NODE_CLASS_MAPPINGS:
                obj_class = nodes.NODE_CLASS_MAPPINGS[x]
                info = {}
                info['input'] = obj_class.INPUT_TYPES()
                info['output'] = obj_class.RETURN_TYPES
                info['name'] = x #TODO
                info['description'] = ''
                info['category'] = 'sd'
                if hasattr(obj_class, 'CATEGORY'):
                    info['category'] = obj_class.CATEGORY
                out[x] = info
            return web.json_response(out)

        self.app.add_routes(routes)
        self.app.add_routes([
            web.static('/', self.web_root),
        ])

    async def publish_loop(self):
        while True:
            msg = await self.messages.get()
            await self.send(*msg)

    async def start(self, address, port, verbose=True, call_on_start=None):
        runner = web.AppRunner(self.app)
        await runner.setup()
        site = web.TCPSite(runner, address, port)
        await site.start()

        if address == '':
            address = '0.0.0.0'
        if verbose:
            print("Starting server\n")
            print("To see the GUI go to: http://{}:{}".format(address, port))
        if call_on_start is not None:
            call_on_start(address, port)