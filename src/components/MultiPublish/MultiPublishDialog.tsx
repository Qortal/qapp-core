import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  LinearProgress,
  Stack
} from '@mui/material';
import { PublishStatus, useMultiplePublishStore, usePublishStatusStore } from "../../state/multiplePublish";
import { ResourceToPublish } from "../../types/qortalRequests/types";




const MultiPublishDialogComponent = () => {
   const { resources, isPublishing } = useMultiplePublishStore((state) => ({
  resources: state.resources,
  isPublishing: state.isPublishing
}));
const { publishStatus, setPublishStatusByKey, getPublishStatusByKey } = usePublishStatusStore();


 useEffect(() => {
    function handleNavigation(event: any) {
     if (event.data?.action === 'PUBLISH_STATUS') {
         const data = event.data;
      console.log('datadata', data)
  // Validate required structure before continuing
  if (
    !data.publishLocation ||
    typeof data.publishLocation.name !== 'string' ||
    typeof data.publishLocation.identifier !== 'string' ||
    typeof data.publishLocation.service !== 'string'
  ) {
    console.warn('Invalid PUBLISH_STATUS data, skipping:', data);
    return;
  }

  const { publishLocation, chunks, totalChunks } = data;

  const key = `${publishLocation?.service}-${publishLocation?.name}-${publishLocation?.identifier}`;

  try {
     const dataToBeSent: any = {};
          if (chunks !== undefined && chunks !== null) {
            dataToBeSent.chunks = chunks;
          }
          if (totalChunks !== undefined && totalChunks !== null) {
            dataToBeSent.totalChunks = totalChunks;
          }
 
    setPublishStatusByKey(key, {
   publishLocation,
      ...dataToBeSent,
      processed: data?.processed || false
});
  } catch (err) {
    console.error('Failed to set publish status:', err);
  }
      } 
    }

    window.addEventListener("message", handleNavigation);

    return () => {
      window.removeEventListener("message", handleNavigation);
    };
  }, []);
  if(!isPublishing) return null
  return (
  <Dialog open={isPublishing}  fullWidth maxWidth="sm">
      <DialogTitle>Publishing Status</DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          {resources.map((publish: ResourceToPublish) => {
           const key = `${publish?.service}-${publish?.name}-${publish?.identifier}`;
            const individualPublishStatus = publishStatus[key] || null
            return (
            <IndividualResourceComponent key={key} publishKey={key} publish={publish} publishStatus={individualPublishStatus} />
            );
          })}
        </Stack>
      </DialogContent>
    </Dialog>
    
  );
};

interface IndividualResourceComponentProps {
  publish: ResourceToPublish
  publishStatus: PublishStatus
  publishKey: string
}
const ESTIMATED_PROCESSING_MS = 5 * 60 * 1000; // 5 minutes

const IndividualResourceComponent = ({publish, publishKey, publishStatus}: IndividualResourceComponentProps)=> {
    const [now, setNow] = useState(Date.now());
console.log('key500',publishKey, publishStatus)

  const chunkPercent = useMemo(()=> {
    if(!publishStatus?.chunks || !publishStatus?.totalChunks) return 0
    return (publishStatus?.chunks / publishStatus?.totalChunks) * 100
  }, [publishStatus])
  console.log('chunkPercent', chunkPercent)
   const chunkDone = useMemo(()=> {
    if(!publishStatus?.chunks || !publishStatus?.totalChunks) return false
    return publishStatus?.chunks === publishStatus?.totalChunks
  }, [publishStatus])

   useEffect(() => {
    if(!chunkDone) return
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [chunkDone]);

  const [processingStart, setProcessingStart] = useState<number | undefined>();

useEffect(() => {
  if (chunkDone && !processingStart) {
    setProcessingStart(Date.now());
  }
}, [chunkDone, processingStart]);

  const processingPercent = useMemo(() => {
  if (!chunkDone || !processingStart || !publishStatus?.totalChunks || !now) return 0;

  const totalMB = publishStatus.totalChunks * 5;
  const estimatedProcessingMs = (300_000 / 2048) * totalMB;

  const elapsed = now - processingStart;
  if(!elapsed || elapsed < 0) return 0
  return Math.min((elapsed / estimatedProcessingMs) * 100, 100);
}, [chunkDone, processingStart, now, publishStatus?.totalChunks]);

  return (
     <Box  p={1} border={1} borderColor="divider" borderRadius={2}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {publishKey}
                </Typography>

                <Box mt={2}>
                  <Typography variant="body2" gutterBottom>
                    File Chunk { (!publishStatus?.chunks || !publishStatus?.totalChunks) ? '' : publishStatus?.chunks}/{publishStatus?.totalChunks} ({(chunkPercent).toFixed(0)}%)
                  </Typography>
                  <LinearProgress variant="determinate" value={chunkPercent} />
                </Box>

                <Box mt={2}>
                  <Typography variant="body2" gutterBottom>
                    File Processing ({(!processingPercent || !processingStart) ? '0' : processingPercent.toFixed(0)}%)
                  </Typography>
                  <LinearProgress variant="determinate" value={processingPercent} />
                </Box>
              </Box>
  )
}

export const MultiPublishDialog = React.memo(MultiPublishDialogComponent);
