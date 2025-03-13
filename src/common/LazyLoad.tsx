import React, { useState, useEffect, useRef } from 'react'
import { useInView } from 'react-intersection-observer'
import CircularProgress from '@mui/material/CircularProgress'

interface Props {
  onLoadMore: () => void
}

const LazyLoad: React.FC<Props> = ({ onLoadMore }) => {

  const [ref, inView] = useInView({
    threshold: 0.7
  })

  useEffect(() => {
    if (inView) {
      onLoadMore()
    }
  }, [inView])

  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        justifyContent: 'center',
        minHeight: '25px'
      }}
    >
    </div>
  )
}

export default LazyLoad
