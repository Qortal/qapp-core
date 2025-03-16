import { CircularProgress } from '@mui/material';
import React, { useEffect, useRef } from 'react'
import { useInView } from 'react-intersection-observer'

interface Props {
  onLoadMore: () => void
}

const LazyLoad: React.FC<Props> = ({ onLoadMore }) => {
  const hasTriggeredRef = useRef(false); // Prevents multiple auto-triggers

  const [ref, inView] = useInView({
    threshold: 0.7,
    triggerOnce: false, // Allows multiple triggers, but we control when
  });

  useEffect(() => {
    if (inView && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true; // Set flag so it doesn’t trigger again immediately
      onLoadMore();
      setTimeout(() => {
        hasTriggeredRef.current = false; // Reset trigger after a short delay
      }, 1000);
    }
  }, [inView]);

  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        justifyContent: 'center',
        height: '50px',
        overflow: 'hidden'
      }}
    ><CircularProgress /></div>
  )
}

export default LazyLoad;
