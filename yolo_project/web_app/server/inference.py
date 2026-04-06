import argparse
import sys
import json
import torch
import pathlib
import os
import warnings

warnings.filterwarnings("ignore")

# Fix for PosixPath issue if needed (though usually fine on Mac)
temp = pathlib.PosixPath
pathlib.PosixPath = pathlib.WindowsPath if os.name == 'nt' else pathlib.PosixPath

def run_inference(image_path, model_path, yolov5_source):
    try:
        if not os.path.exists(model_path):
             print(json.dumps({"error": f"Model not found at {model_path}"}))
             return

        # Load model with explicit source
        # We need 'custom' mode but source='local' pointing to the cloned repo
        if not os.path.exists(yolov5_source):
            print(json.dumps({"error": f"YOLOv5 source not found at {yolov5_source}"}))
            return

        # Suppress prints from torch.hub.load and model invocation
        import contextlib
        with open(os.devnull, 'w') as f, contextlib.redirect_stdout(f), contextlib.redirect_stderr(f):
             model = torch.hub.load(yolov5_source, 'custom', path=model_path, source='local')
        # Run inference
        from PIL import Image
        import numpy as np
        
        img = Image.open(image_path)
        results = model(img)
        
        # Parse results for JSON
        df = results.pandas().xyxy[0]
        
        # Manually draw bounding boxes
        from PIL import ImageDraw, ImageFont
        draw = ImageDraw.Draw(img)
        
        # Try to load a font, fallback to default if necessary
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except IOError:
            font = ImageFont.load_default()

        # Iterate over detections and draw
        for index, row in df.iterrows():
            # Convert to int for safer drawing
            xmin, ymin, xmax, ymax = int(row['xmin']), int(row['ymin']), int(row['xmax']), int(row['ymax'])
            label = f"{row['name']} {row['confidence']:.2f}"
            
            # Draw rectangle (Thicker line = 5)
            draw.rectangle([xmin, ymin, xmax, ymax], outline="red", width=5)
            
            # Draw text with background
            text_bbox = draw.textbbox((xmin, ymin), label, font=font)
            # Ensure proper background size
            draw.rectangle([text_bbox[0]-2, text_bbox[1]-2, text_bbox[2]+2, text_bbox[3]+2], fill="red")
            draw.text((xmin, ymin), label, fill="white", font=font)
            
        # Construct output path
        directory, filename = os.path.split(image_path)
        tagged_filename = f"tagged_{filename}"
        tagged_path = os.path.join(directory, tagged_filename)
        
        img.save(tagged_path)
        
        output_json = {
            "tagged_image": tagged_filename,
            "label": "No Waste Detected",
            "confidence": 0.0,
            "total_items": 0,
            "bbox": []
        }
        
        if not df.empty:
            # Taking top result for text label
            top_result = df.iloc[0]
            
            # Count total items efficiently
            total_items = int(len(df)) if df is not None else 0
            
            output_json.update({
                "label": top_result['name'],
                "confidence": float(top_result['confidence']),
                "total_items": total_items,
                "bbox": [
                    float(top_result['xmin']), 
                    float(top_result['ymin']), 
                    float(top_result['xmax']), 
                    float(top_result['ymax'])
                ]
            })
            
        print(json.dumps(output_json))
            
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True, help="Path to image file")
    parser.add_argument("--model", required=True, help="Path to .pt model")
    parser.add_argument("--source", required=True, help="Path to yolov5 source code")
    
    args = parser.parse_args()
    run_inference(args.image, args.model, args.source)
