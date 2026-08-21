import React from 'react';
import './Table.css';

const Table = ({
  columns = [], // [{ header: 'Header Name', key: 'colKey', render: (row) => jsx }]
  data = [],
  keyField = 'id',
  emptyMessage = 'No records found.',
  className = '',
  loading = false,
}) => {
  return (
    <div className={`table-container ${className}`}>
      <table className="custom-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={col.key || idx} style={{ width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="table-loading-cell">
                <div className="table-loader"></div>
                <span>Loading records...</span>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-empty-cell">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr key={row[keyField] || row._id || rowIdx}>
                {columns.map((col, colIdx) => (
                  <td key={col.key || colIdx}>
                    {col.render ? col.render(row, rowIdx) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
