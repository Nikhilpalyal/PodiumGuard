import React from 'react';

const ModelViewer = () => {
  // Try to use the model from the public folder
  const modelPath = '/2014-ferrari-laferrari/scene.gltf';
  
  // Fallback to a placeholder image if model fails to load
  const handleError = (e) => {
    console.error('Error loading 3D model:', e);
    e.target.style.display = 'none';
    const placeholder = document.createElement('div');
    placeholder.className = 'model-placeholder';
    placeholder.innerHTML = '3D Model Placeholder';
    e.target.parentNode.appendChild(placeholder);
  };

  return (
    <div className="model-container">
      <div className="model-wrapper">
        {/* Using iframe as a simple way to display 3D models */}
        <iframe
          src="/2014-ferrari-laferrari/index.html"
          title="3D Model Viewer"
          className="model-iframe"
          onError={handleError}
          allowFullScreen
        />
      </div>
    </div>
  );
};

export default ModelViewer;
