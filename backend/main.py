import io
import os
import sys
import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

# Add parent directory to path to import ref_functions if needed
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from backend.scorers import SimpleNoiseScorer, PCAScorer
from backend.metadata_utils import parse_metadata

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"Hello": "Kuro Viewer Backend"}


@app.post("/analyze/noise")
async def analyze_noise(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        pil_image = Image.open(io.BytesIO(contents))

        scorer = SimpleNoiseScorer()
        # Returns: final_score, isolated_bg_pil, noise_map_pil, raw_noise_level
        score, isolated_bg, noise_map, raw_noise = scorer.score(pil_image)

        return {"score": score, "raw_noise": raw_noise, "filename": file.filename}
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/analyze/pca")
async def analyze_pca(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        pil_image = Image.open(io.BytesIO(contents))

        scorer = PCAScorer()
        score = scorer.score(pil_image)

        return {"score": score, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/metadata")
async def get_metadata(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        # Create a BytesIO object because parse_metadata needs to open or read it
        metadata = parse_metadata(io.BytesIO(contents))
        return {"filename": file.filename, "metadata": metadata}
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e)) from e


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
