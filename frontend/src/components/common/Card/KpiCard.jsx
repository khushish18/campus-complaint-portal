import React from 'react';
import Card from './Card';
import './Card.css';

const KpiCard = ({
  icon: Icon,
  title,
  value,
  description,
  color = 'var(--primary)',
  colorLight = 'var(--primary-light)',
  onClick,
}) => {
  return (
    <Card 
      onClick={onClick} 
      style={{ borderLeft: `4px solid ${color}`, padding: '1rem' }}
    >
      <div className="kpi-card-inner">
        {Icon && (
          <div 
            className="kpi-card-icon-container"
            style={{ 
              backgroundColor: colorLight || `${color}15`, 
              color: color,
            }}
          >
            <Icon size={20} />
          </div>
        )}
        <div className="kpi-card-content">
          <span className="kpi-card-title">
            {title}
          </span>
          <h4 className="kpi-card-value">
            {value}
          </h4>
          {description && (
            <span className="kpi-card-description">
              {description}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};

export default KpiCard;
