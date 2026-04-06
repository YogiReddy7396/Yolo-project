import streamlit as st
from ultralytics import YOLO
from PIL import Image
import numpy as np

# 1. Load the Model
# Replace 'yolov8n.pt' with the path to your specific garbage detection model
# e.g., model = YOLO('best_garbage_model.pt')
try:
    model = YOLO('garbage_model.pt') 
except Exception as e:
    st.error(f"Error loading model: {e}")

st.title("🗑️ AI Garbage Detector")
st.write("Upload an image to detect waste categories.")

# 2. Image Upload Widget
uploaded_file = st.file_uploader("Choose an image...", type=["jpg", "jpeg", "png"])

if uploaded_file is not None:
    # Display original image
    image = Image.open(uploaded_file)
    st.image(image, caption='Uploaded Image', use_container_width=True)
    
    st.write("Detecting...")
    
    # 3. Perform Inference
    # conf=0.25 sets the sensitivity threshold
    results = model.predict(image, conf=0.25)

    # 4. Draw Boundary Boxes
    # result.plot() creates a new image array with the boxes drawn
    res_plotted = results[0].plot()
    
    # Convert back to PIL Image for display in Streamlit
    res_image = Image.fromarray(res_plotted[..., ::-1]) # RGB conversion
    
    st.success("Detection Complete!")
    st.image(res_image, caption='Detected Waste', use_container_width=True)

    # Optional: List detected categories
    st.write("### Detected Objects:")
    boxes = results[0].boxes
    for box in boxes:
        cls = int(box.cls[0])
        conf = float(box.conf[0])
        name = model.names[cls]
        st.write(f"- **{name}** (Confidence: {conf:.2f})")




#project_explanation copy.txt project_explanation.txt req.txt
#streamlit run app.py