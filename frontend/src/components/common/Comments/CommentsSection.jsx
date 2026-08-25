import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Button from '../Button/Button';
import Input from '../Input/Input';
import api from '../../../services/api';
import { MessageSquare, Send } from 'lucide-react';
import './CommentsSection.css';

const CommentsSection = ({ complaintId, initialComments = [] }) => {
  const { user, socket } = useAuth();
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const threadEndRef = useRef(null);

  // Sync initial comments when props change (e.g. details modal reloads)
  useEffect(() => {
    setComments(initialComments || []);
  }, [initialComments, complaintId]);

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Real-time socket comment updates
  useEffect(() => {
    if (!socket) return;

    const handleNewComment = (data) => {
      if (data.complaintId === complaintId) {
        setComments((prev) => {
          if (prev.some((c) => c._id === data.comment._id)) return prev;
          return [...prev, data.comment];
        });
      }
    };

    socket.on('newComment', handleNewComment);
    return () => {
      socket.off('newComment', handleNewComment);
    };
  }, [socket, complaintId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      const response = await api.post(`/complaints/${complaintId}/comments`, {
        text: text.trim(),
      });
      if (response.success) {
        setComments((prev) => {
          if (prev.some((c) => c._id === response.comment._id)) return prev;
          return [...prev, response.comment];
        });
        setText('');
      }
    } catch (err) {
      setError(err.message || 'Failed to submit comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return '#1e1b4b'; // dark blue
      case 'warden':
        return '#f59e0b'; // warning gold
      case 'staff':
        return '#6366f1'; // indigo
      case 'student':
      default:
        return '#10b981'; // green
    }
  };

  // Admins are read-only, check if allowed to post
  const canPost = user && user.role !== 'admin';

  return (
    <div className="comments-section-container">
      <div className="comments-header">
        <MessageSquare size={18} />
        <h4>Discussion Thread</h4>
        <span className="comments-count">{comments.length} comments</span>
      </div>

      <div className="comments-thread">
        {comments.map((comment) => {
          const isMe = user && comment.author?._id === user.id;
          const authorRole = comment.author?.role || 'user';
          
          return (
            <div key={comment._id || comment.timestamp} className={`comment-bubble-wrapper ${isMe ? 'me' : 'others'}`}>
              <div className="comment-meta">
                <span className="comment-author">{comment.author?.name || 'Unknown'}</span>
                <span 
                  className="comment-role-badge" 
                  style={{ backgroundColor: getRoleColor(authorRole) }}
                >
                  {authorRole}
                </span>
                <span className="comment-time">
                  {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="comment-bubble">
                <p>{comment.text}</p>
              </div>
            </div>
          );
        })}
        {comments.length === 0 && (
          <div className="comments-empty">
            No discussion has started yet. Post a comment to begin.
          </div>
        )}
        <div ref={threadEndRef} />
      </div>

      {canPost ? (
        <form onSubmit={handleSubmit} className="comments-input-form">
          {error && <div className="comments-error">{error}</div>}
          <div className="comments-input-wrapper">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Post a comment or update (max 1000 chars)..."
              disabled={submitting}
              maxLength={1000}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || !text.trim()}
              loading={submitting}
              icon={Send}
              size="sm"
            >
              Send
            </Button>
          </div>
        </form>
      ) : (
        <div className="comments-readonly-notice">
          Platform Admins have read-only access to ticket comments.
        </div>
      )}
    </div>
  );
};

export default CommentsSection;
