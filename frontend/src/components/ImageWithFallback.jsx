import { useEffect, useState } from 'react';

const ImageWithFallback = ({ src, alt, className = '', loading = 'lazy' }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return <div className={`item-image-placeholder ${className}`.trim()} role="img" aria-label={alt || 'No image'}>No image</div>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setFailed(true)}
    />
  );
};

export default ImageWithFallback;
