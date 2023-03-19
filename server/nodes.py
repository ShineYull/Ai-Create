class TestNode:
    @classmethod
    def INPUT_TYPES(s):
        return {"required": { "image": ("IMAGE",)}}

    RETURN_TYPES = ("IMAGE",)
    CATEGORY = "basic"

class TestNodea:
    @classmethod
    def INPUT_TYPES(s):
        return {"required": { "image": ("NUMBER",)}}

    RETURN_TYPES = ("NUMBER",)
    CATEGORY = "basic"

NODE_CLASS_MAPPINGS = {
    "TestNode": TestNode,
    "TestNodea": TestNodea,
}