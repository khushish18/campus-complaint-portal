import React from 'react';
import './Card.css';

const Card = ({
  title,
  children,
  extra, // elements to render in the header right-side (e.g. quick buttons)
  onClick,
  className = '',
  ...props
}) => {
  const isClickable = !!onClick;

  return (
    <div
      className={`card ${isClickable ? 'card-clickable' : ''} ${className}`}
      onClick={onClick}
      {...props}
    >
      {(title || extra) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {extra && <div className="card-extra">{extra}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
};

export default Card;
