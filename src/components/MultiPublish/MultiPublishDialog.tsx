import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  LinearProgress,
  Stack,
  DialogActions,
  Button,
} from '@mui/material';
import {
  PublishStatus,
  useMultiplePublishStore,
  usePublishStatusStore,
} from '../../state/multiplePublish';
import { ResourceToPublish } from '../../types/qortalRequests/types';
import { QortalGetMetadata } from '../../types/interfaces/resources';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useLibTranslation } from '../../hooks/useLibTranslation';
import { t } from 'i18next';

export interface MultiplePublishError {
  error: {
    unsuccessfulPublishes: any[];
  };
}

export const MultiPublishDialogComponent = () => {
  const { t } = useLibTranslation();

  const {
    resources,
    isPublishing,
    failedResources,
    reset,
    reject,
    error: publishError,
    isLoading,
    setIsLoading,
    setError,
    setFailedPublishResources,
    complete,
  } = useMultiplePublishStore((state) => ({
    resources: state.resources,
    isPublishing: state.isPublishing,
    failedResources: state.failedResources,
    reset: state.reset,
    reject: state.reject,
    error: state.error,
    isLoading: state.isLoading,
    setIsLoading: state.setIsLoading,
    setError: state.setError,
    setFailedPublishResources: state.setFailedPublishResources,
    complete: state.complete,
  }));

  const {
    publishStatus,
    setPublishStatusByKey,
    reset: resetStatusStore,
  } = usePublishStatusStore();

  const resourcesToPublish = useMemo(() => {
    return resources.filter((item) =>
      failedResources.some(
        (f) =>
          f?.name === item?.name &&
          f?.identifier === item?.identifier &&
          f?.service === item?.service
      )
    );
  }, [resources, failedResources]);

  const publishMultipleResources = useCallback(async () => {
    const timeout = resources.length * 1200000;

    try {
      resourcesToPublish.forEach((item) => {
        const key = `${item?.service}-${item?.name}-${item?.identifier}`;
        setPublishStatusByKey(key, {
          error: undefined,
          chunks: 0,
          totalChunks: 0,
        });
      });

      setIsLoading(true);
      setError(null);
      setFailedPublishResources([]);

      const result = await qortalRequestWithTimeout(
        {
          action: 'PUBLISH_MULTIPLE_QDN_RESOURCES',
          resources: resourcesToPublish,
        },
        timeout
      );

      complete(result);
      reset();
      resetStatusStore();
    } catch (error: any) {
      const unPublished = error?.error?.unsuccessfulPublishes;
      const failedPublishes: QortalGetMetadata[] = [];

      if (unPublished && Array.isArray(unPublished)) {
        unPublished.forEach((item) => {
          const key = `${item?.service}-${item?.name}-${item?.identifier}`;
          setPublishStatusByKey(key, {
            error: { reason: item?.reason },
          });

          failedPublishes.push({
            name: item?.name,
            service: item?.service,
            identifier: item?.identifier,
          });
        });
        setFailedPublishResources(failedPublishes);
      } else {
        setError(
          error instanceof Error ? error.message : 'Error during publish'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    resourcesToPublish,
    resources,
    setPublishStatusByKey,
    setIsLoading,
    setError,
    setFailedPublishResources,
    complete,
  ]);

  const handleNavigation = useCallback(
    (event: any) => {
      if (event.data?.action !== 'PUBLISH_STATUS') return;

      const data = event.data;

      if (
        !data.publishLocation ||
        typeof data.publishLocation?.name !== 'string' ||
        typeof data.publishLocation?.service !== 'string'
      ) {
        console.warn('Invalid PUBLISH_STATUS data, skipping:', data);
        return;
      }

      const {
        publishLocation,
        chunks,
        totalChunks,
        retry,
        filename,
        processed,
      } = data;

      const key = `${publishLocation?.service}-${publishLocation?.name}-${publishLocation?.identifier}`;

      const update: any = {
        publishLocation,
        processed: processed || false,
      };
      if (chunks != null && chunks !== undefined) update.chunks = chunks;
      if (totalChunks != null && totalChunks !== undefined)
        update.totalChunks = totalChunks;
      if (retry != null && retry !== undefined) update.retry = retry;
      if (filename != null && retry !== undefined) update.filename = filename;

      try {
        setPublishStatusByKey(key, update);
      } catch (err) {
        console.error('Failed to set publish status:', err);
      }
    },
    [setPublishStatusByKey]
  );

  useEffect(() => {
    window.addEventListener('message', handleNavigation);
    return () => window.removeEventListener('message', handleNavigation);
  }, [handleNavigation]);

  if (!isPublishing) return null;

  return (
    <Dialog
      open={isPublishing}
      fullWidth
      maxWidth="sm"
      sx={{ zIndex: 999990 }}
      slotProps={{ paper: { elevation: 0 } }}
      disableEnforceFocus
      disableAutoFocus
      disableRestoreFocus
    >
      <DialogTitle>{t('multi_publish.title')}</DialogTitle>
      <DialogContent>
        {publishError && (
          <Stack spacing={3}>
            <Box
              mt={2}
              sx={{ display: 'flex', gap: '5px', alignItems: 'center' }}
            >
              <ErrorIcon color="error" />
              <Typography variant="body2">{publishError}</Typography>
            </Box>
          </Stack>
        )}

        {!publishError && (
          <Stack spacing={3}>
            {resources.map((publish) => {
              const key = `${publish?.service}-${publish?.name}-${publish?.identifier}`;
              const individualPublishStatus = publishStatus[key] || null;
              return (
                <IndividualResourceComponent
                  key={key}
                  publishKey={key}
                  publish={publish}
                  publishStatus={individualPublishStatus}
                />
              );
            })}
          </Stack>
        )}
      </DialogContent>
      <DialogActions
        sx={{
          flexDirection: 'column',
          gap: '15px',
        }}
      >
        {failedResources?.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              gap: '10px',
            }}
          >
            <ErrorIcon color="error" />
            <Typography variant="body2">
              {t('multi_publish.publish_failed')}
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            display: 'flex',
            gap: '10px',
            width: '100%',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            disabled={isLoading}
            color="error"
            variant="contained"
            onClick={() => {
              reject(new Error('Canceled Publish'));
              reset();
            }}
          >
            {t('actions.close')}
          </Button>
          {failedResources?.length > 0 && (
            <Button
              disabled={isLoading || resourcesToPublish.length === 0}
              color="success"
              variant="contained"
              onClick={publishMultipleResources}
            >
              {t('actions.retry')}
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};
interface IndividualResourceComponentProps {
  publish: ResourceToPublish;
  publishStatus: PublishStatus;
  publishKey: string;
}

const IndividualResourceComponent = ({
  publish,
  publishKey,
  publishStatus,
}: IndividualResourceComponentProps) => {
  const { t } = useLibTranslation();

  const [now, setNow] = useState(Date.now());
  const [processingStart, setProcessingStart] = useState<number | undefined>();

  const chunkPercent = useMemo(() => {
    if (!publishStatus?.chunks || !publishStatus?.totalChunks) return 0;
    return (publishStatus.chunks / publishStatus.totalChunks) * 100;
  }, [publishStatus?.chunks, publishStatus?.totalChunks]);

  const chunkDone = useMemo(() => {
    return (
      publishStatus?.chunks > 0 &&
      publishStatus?.totalChunks > 0 &&
      publishStatus?.chunks === publishStatus?.totalChunks
    );
  }, [publishStatus?.chunks, publishStatus?.totalChunks]);

  // Start processing timer once chunking completes
  useEffect(() => {
    if (chunkDone && !processingStart) {
      setProcessingStart(Date.now());
    }
  }, [chunkDone, processingStart]);

  // Keep time ticking for progress simulation
  useEffect(() => {
    if (!chunkDone) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [chunkDone]);
  const processingPercent = useMemo(() => {
    if (
      publishStatus?.error ||
      !chunkDone ||
      !processingStart ||
      !publishStatus?.totalChunks ||
      !now
    )
      return 0;

    const totalMB = publishStatus.totalChunks * 5; // assume 5MB per chunk
    const estimatedProcessingMs = (300_000 / 2048) * totalMB; // 5min per 2GB scaled

    const elapsed = now - processingStart;
    if (elapsed <= 0) return 0;
    return Math.min((elapsed / estimatedProcessingMs) * 100, 100);
  }, [
    chunkDone,
    processingStart,
    now,
    publishStatus?.totalChunks,
    publishStatus?.error,
  ]);

  return (
    <Box p={1} border={1} borderColor="divider" borderRadius={2}>
      <Typography variant="subtitle1" fontWeight="bold">
        {publish?.filename || publishStatus?.filename || publishKey}
      </Typography>

      <Box mt={2}>
        <Typography variant="body2" gutterBottom>
          {t('multi_publish.file_chunk')} {publishStatus?.chunks || 0}/
          {publishStatus?.totalChunks || 0} ({chunkPercent.toFixed(0)}%)
        </Typography>
        <LinearProgress variant="determinate" value={chunkPercent} />
      </Box>

      <Box mt={2}>
        <Typography variant="body2" gutterBottom>
          {t('multi_publish.file_processing')} (
          {publishStatus?.processed
            ? 100
            : processingStart
              ? processingPercent.toFixed(0)
              : '0'}
          %)
        </Typography>
        <LinearProgress
          variant="determinate"
          value={publishStatus?.processed ? 100 : processingPercent}
        />
      </Box>

      {publishStatus?.processed && (
        <Box mt={2} display="flex" gap={1} alignItems="center">
          <CheckCircleIcon color="success" />
          <Typography variant="body2">{t('multi_publish.success')}</Typography>
        </Box>
      )}

      {publishStatus?.retry &&
        !publishStatus?.error &&
        !publishStatus?.processed && (
          <Box mt={2} display="flex" gap={1} alignItems="center">
            <ErrorIcon color="error" />
            <Typography variant="body2">
              {t('multi_publish.attempt_retry')}
            </Typography>
          </Box>
        )}

      {publishStatus?.error && !publishStatus?.processed && (
        <Box mt={2} display="flex" gap={1} alignItems="center">
          <ErrorIcon color="error" />
          <Typography variant="body2">
            {t('multi_publish.publish_failed')} -{' '}
            {publishStatus?.error?.reason || 'Unknown error'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export const MultiPublishDialog = React.memo(MultiPublishDialogComponent);
