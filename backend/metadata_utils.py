import json
import contextlib
from typing import Any
from PIL import Image


def parse_metadata(image_path_or_file) -> list[dict[str, Any]]:
    """
    Parses metadata from an image, focusing on GenAI (SD, ComfyUI) and basic EXIF.
    Returns a list of categories with entries, matching the frontend's ImageMetadata type.
    """
    try:
        with Image.open(image_path_or_file) as img:
            info = img.info
            metadata = []

            # 1. File Basic Info
            file_entries = [
                {"key": "Format", "value": img.format},
                {"key": "Dimensions", "value": f"{img.width}x{img.height}"},
                {"key": "Mode", "value": img.mode},
            ]

            # 2. Stable Diffusion (A1111) Parameters
            if "parameters" in info:
                params_str = info["parameters"]
                gen_entries = []

                # Split prompt, negative prompt, and settings
                # Typical format: Prompt\nNegative prompt: ...\nSteps: 20, Sampler: ...
                parts = params_str.split("\n")
                prompt = parts[0]
                neg_prompt = ""
                settings = ""

                for part in parts[1:]:
                    if part.startswith("Negative prompt:"):
                        neg_prompt = part[len("Negative prompt:") :].strip()
                    elif ":" in part:
                        settings = part

                gen_entries.append({"key": "Prompt", "value": prompt, "isLong": True})
                if neg_prompt:
                    gen_entries.append({"key": "Negative Prompt", "value": neg_prompt, "isLong": True})

                if settings:
                    for kv in settings.split(","):
                        if ":" in kv:
                            k, v = kv.split(":", 1)
                            gen_entries.append({"key": k.strip(), "value": v.strip()})

                metadata.append({"id": "generation", "label": "SD Parameters", "entries": gen_entries})

            # 3. ComfyUI Integration (PNG/APNG/WebP)
            comfy_prompt = None
            extra_info = {}

            # PNG/APNG Text Chunks
            if "prompt" in info:
                with contextlib.suppress(Exception):
                    comfy_prompt = json.loads(info["prompt"])

            # Check for extra_pnginfo style keys in PNG info
            for key, value in info.items():
                if key not in ["prompt", "parameters", "exif", "icc_profile"] and isinstance(value, str):
                    with contextlib.suppress(Exception):
                        extra_info[key] = json.loads(value)

            # WebP EXIF Support
            if img.format == "WEBP":
                exif = img.getexif()
                if exif:
                    # Tag 0x0110 (Model) for prompt: {"prompt": {...}}
                    if 0x0110 in exif:
                        val = exif[0x0110]
                        if isinstance(val, str) and val.startswith("prompt:"):
                            with contextlib.suppress(Exception):
                                comfy_prompt = json.loads(val[7:])

                    # Tag 0x010F (Make) and below for extra_pnginfo
                    for tag in range(0x010F, 0x0100, -1):
                        if tag in exif:
                            val = exif[tag]
                            if isinstance(val, str) and ":" in val:
                                k, v = val.split(":", 1)
                                with contextlib.suppress(Exception):
                                    extra_info[k] = json.loads(v)

            # Add ComfyUI category if found
            if comfy_prompt or extra_info:
                comfy_entries = []
                if comfy_prompt:
                    comfy_entries.append({"key": "Workflow Nodes", "value": f"{len(comfy_prompt)} nodes detected", "isLong": False})
                    # Optional: Add raw prompt if small, or just indicate presence
                    # comfy_entries.append({"key": "Prompt JSON", "value": json.dumps(comfy_prompt), "isLong": True})

                for k, v in extra_info.items():
                    val_str = json.dumps(v) if isinstance(v, (dict, list)) else str(v)
                    comfy_entries.append({"key": k, "value": val_str, "isLong": True})

                metadata.append({"id": "comfy", "label": "ComfyUI Metadata", "entries": comfy_entries})

            # Always add file info as first category
            metadata.insert(0, {"id": "file", "label": "File Information", "entries": file_entries})

            return metadata

    except Exception as e:
        print(f"Error parsing metadata: {e}")
        return [{"id": "error", "label": "Error", "entries": [{"key": "Parsing Error", "value": str(e)}]}]
