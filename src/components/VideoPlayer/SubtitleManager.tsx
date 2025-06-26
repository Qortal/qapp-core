import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  QortalGetMetadata,
  QortalMetadata,
  Service,
} from "../../types/interfaces/resources";
import {
  alpha,
  Box,
  Button,
  ButtonBase,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fade,
  IconButton,
  Popover,
  Skeleton,
  Tab,
  Tabs,
  Typography,
  useTheme,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ModeEditIcon from "@mui/icons-material/ModeEdit";
import CloseIcon from "@mui/icons-material/Close";
import { useListStore } from "../../state/lists";
import { Resource, useResources } from "../../hooks/useResources";
import { useGlobal } from "../../context/GlobalProvider";
import { ENTITY_SUBTITLE, SERVICE_SUBTITLE } from "./video-player-constants";
import ISO6391, { LanguageCode } from "iso-639-1";
import LanguageSelect from "./LanguageSelect";
import DownloadIcon from "@mui/icons-material/Download";
import DownloadingIcon from "@mui/icons-material/Downloading";
import {
  useDropzone,
  DropzoneRootProps,
  DropzoneInputProps,
} from "react-dropzone";
import { fileToBase64, objectToBase64 } from "../../utils/base64";
import { ResourceToPublish } from "../../types/qortalRequests/types";
import { useListReturn } from "../../hooks/useListData";
import { usePublish } from "../../hooks/usePublish";
import { Spacer } from "../../common/Spacer";
import {
  dismissToast,
  showError,
  showLoading,
  showSuccess,
} from "../../utils/toast";
import { RequestQueueWithPromise } from "../../utils/queue";

export const requestQueueGetStatus = new RequestQueueWithPromise(1);

export interface SubtitleManagerProps {
  qortalMetadata: QortalGetMetadata;
  close: () => void;
  open: boolean;
  onSelect: (subtitle: SubtitlePublishedData) => void;
  subtitleBtnRef: any;
  currentSubTrack: null | string;
  setDrawerOpenSubtitles: (val: boolean) => void;
  isFromDrawer: boolean;
  exitFullscreen: () => void;
}
export interface Subtitle {
  language: string | null;
  base64: string;
  type: string;
  filename: string;
  size: number;
}
export interface SubtitlePublishedData {
  language: string | null;
  subtitleData: string;
  type: string;
  filename: string;
  size: number;
}

export const languageOptions = ISO6391.getAllCodes().map((code) => ({
  code,
  name: ISO6391.getName(code),
  nativeName: ISO6391.getNativeName(code),
}));

function a11yProps(index: number) {
  return {
    id: `subtitle-tab-${index}`,
    "aria-controls": `subtitle-tabpanel-${index}`,
  };
}

const SubtitleManagerComponent = ({
  qortalMetadata,
  open,
  close,
  onSelect,
  subtitleBtnRef,
  currentSubTrack,
  setDrawerOpenSubtitles,
  isFromDrawer = false,
  exitFullscreen,
}: SubtitleManagerProps) => {
  const [mode, setMode] = useState(1);
  const [isOpenPublish, setIsOpenPublish] = useState(false);
  const { lists, identifierOperations, auth } = useGlobal();
  const [isLoading, setIsLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const { fetchResources } = useResources();
  // const [subtitles, setSubtitles] = useState([])
  const subtitles = useListReturn(
    `subs-${qortalMetadata?.service}-${qortalMetadata?.name}-${qortalMetadata?.identifier}`
  );
  const mySubtitles = useMemo(() => {
    if (!auth?.name) return [];
    return subtitles?.filter((sub) => sub.name === auth?.name);
  }, [subtitles, auth?.name]);
  const getPublishedSubtitles = useCallback(async () => {
    try {
      setIsLoading(true);
      const videoId = `${qortalMetadata?.service}-${qortalMetadata?.name}-${qortalMetadata?.identifier}`;
      const postIdSearch = await identifierOperations.buildLooseSearchPrefix(
        ENTITY_SUBTITLE,
        videoId
      );
      let name: string | undefined = qortalMetadata?.name;
      if (showAll) {
        name = undefined;
      }
      const searchParams = {
        service: SERVICE_SUBTITLE,
        identifier: postIdSearch,
        name,
        limit: 0,
        includeMetadata: true,
      };
      const res = await lists.fetchResourcesResultsOnly(searchParams);
      lists.addList(
        `subs-${videoId}`,
        res?.filter((item) => !!item?.metadata?.title) || []
      );
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [showAll]);

  useEffect(() => {
    if (
      !qortalMetadata?.identifier ||
      !qortalMetadata?.name ||
      !qortalMetadata?.service
    )
      return;

    getPublishedSubtitles();
  }, [
    qortalMetadata?.identifier,
    qortalMetadata?.service,
    qortalMetadata?.name,
    getPublishedSubtitles,
  ]);

  const ref = useRef<any>(null);

  useEffect(() => {
    if (open) {
      ref?.current?.focus();
    }
  }, [open]);

  const handleBlur = (e: React.FocusEvent) => {
    if (
      !e.currentTarget.contains(e.relatedTarget) &&
      !isOpenPublish &&
      !isFromDrawer &&
      open
    ) {
      close();
      setIsOpenPublish(false);
    }
  };

  const publishHandler = async (subtitles: Subtitle[]) => {
    try {
      const videoId = `${qortalMetadata?.service}-${qortalMetadata?.name}-${qortalMetadata?.identifier}`;

      const name = auth?.name;
      if (!name) return;
      const resources: ResourceToPublish[] = [];
      const tempResources: { qortalMetadata: QortalMetadata; data: any }[] = [];
      for (const sub of subtitles) {
        const identifier = await identifierOperations.buildLooseIdentifier(
          ENTITY_SUBTITLE,
          videoId
        );
        const data = {
          subtitleData: sub.base64,
          language: sub.language,
          filename: sub.filename,
          type: sub.type,
        };

        const base64Data = await objectToBase64(data);
        const resource = {
          name,
          identifier,
          service: SERVICE_SUBTITLE,
          base64: base64Data,
          filename: sub.filename,
          title: sub.language || undefined,
        };
        resources.push(resource);
        tempResources.push({
          qortalMetadata: {
            identifier,
            service: SERVICE_SUBTITLE,
            name,
            size: 100,
            created: Date.now(),
            metadata: {
              title: sub.language || undefined,
            },
          },
          data: data,
        });
      }

      await qortalRequest({
        action: "PUBLISH_MULTIPLE_QDN_RESOURCES",
        resources,
      });

      lists.addNewResources(
        `subs-${qortalMetadata?.service}-${qortalMetadata?.name}-${qortalMetadata?.identifier}`,
        tempResources
      );
    } catch (error) {}
  };
  const onBack = () => {
    if (mode === 1) close();
  };

  const onSelectHandler = (sub: SubtitlePublishedData) => {
    onSelect(sub);
    close();
  };

  const theme = useTheme();
  if (!open) return null;
  return (
    <>
      <Box
        ref={ref}
        tabIndex={-1}
        onBlur={handleBlur}
        bgcolor={alpha("#181818", 0.98)}
        sx={{
          position: isFromDrawer ? "relative" : "absolute",
          bottom: isFromDrawer ? "unset" : 60,
          right: isFromDrawer ? "unset" : 5,
          color: "white",
          opacity: 0.9,
          borderRadius: 2,
          boxShadow: isFromDrawer ? "unset" : 5,
          p: 1,
          minWidth: 225,
          height: 300,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          zIndex: 10,
        }}
      >
        <Box
          sx={{
            padding: "5px 0px 10px 0px",
            display: "flex",
            gap: "10px",
            width: "100%",
          }}
        >
          <ButtonBase onClick={onBack}>
            <ArrowBackIosIcon
              sx={{
                fontSize: "1.15em",
              }}
            />
          </ButtonBase>
          <ButtonBase>
            <Typography
              onClick={onBack}
              sx={{
                fontSize: "0.85rem",
              }}
            >
              Subtitles
            </Typography>
          </ButtonBase>
          <ButtonBase
            sx={{
              marginLeft: "auto",
            }}
            onClick={() => {
              setIsOpenPublish(true);
            }}
          >
            <ModeEditIcon
              sx={{
                fontSize: "1.15rem",
              }}
            />
          </ButtonBase>
        </Box>
        <Divider />
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            overflow: "auto",
            "::-webkit-scrollbar-track": {
              backgroundColor: "transparent",
            },

            "::-webkit-scrollbar": {
              width: "16px",
              height: "10px",
            },

            "::-webkit-scrollbar-thumb": {
              backgroundColor: theme.palette.primary.main,
              borderRadius: "8px",
              backgroundClip: "content-box",
              border: "4px solid transparent",
              transition: "0.3s background-color",
            },

            "::-webkit-scrollbar-thumb:hover": {
              backgroundColor: theme.palette.primary.dark,
            },
          }}
        >
          {isLoading && <CircularProgress />}
          {!isLoading && subtitles?.length === 0 && (
            <Typography
              sx={{
                fontSize: "1rem",
                width: "100%",
                textAlign: "center",
                marginTop: "20px",
              }}
            >
              No subtitles
            </Typography>
          )}

          {mode === 1 && !isLoading && subtitles?.length > 0 && (
            <PublisherSubtitles
              subtitles={subtitles}
              publisherName={qortalMetadata.name}
              setMode={setMode}
              onSelect={onSelectHandler}
              onBack={onBack}
              currentSubTrack={currentSubTrack}
            />
          )}
        </Box>
        <Box
          sx={{
            display: "flex",
            width: "100%",
            justifyContent: "center",
          }}
        >
          <Button
            variant="contained"
            size="small"
            disabled={showAll}
            onClick={() => setShowAll(true)}
          >
            Load community subs
          </Button>
        </Box>
      </Box>
      <PublishSubtitles
        isOpen={isOpenPublish}
        setIsOpen={setIsOpenPublish}
        publishHandler={publishHandler}
        mySubtitles={mySubtitles}
      />
    </>
  );
};

interface PublisherSubtitlesProps {
  publisherName: string;
  subtitles: any[];
  setMode: (val: number) => void;
  onSelect: (subtitle: any) => void;
  onBack: () => void;
  currentSubTrack: string | null;
}

const PublisherSubtitles = ({
  publisherName,
  subtitles,
  setMode,
  onSelect,
  onBack,
  currentSubTrack,
}: PublisherSubtitlesProps) => {
  return (
    <>
      <ButtonBase
        disabled={!currentSubTrack}
        onClick={() => onSelect(null)}
        sx={{
          px: 2,
          py: 1,
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.1)",
          },
          width: "100%",
          justifyContent: "space-between",
        }}
      >
        <Typography>Off</Typography>
        {!currentSubTrack ? <CheckIcon /> : <ArrowForwardIosIcon />}
      </ButtonBase>

      {subtitles?.map((sub, i) => {
        return (
          <Subtitle
            currentSubtrack={currentSubTrack}
            onSelect={onSelect}
            sub={sub}
            key={i}
          />
        );
      })}
    </>
  );
};

interface PublishSubtitlesProps {
  publishHandler: (subs: Subtitle[]) => Promise<void>;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  mySubtitles: QortalGetMetadata[];
}

const PublishSubtitles = ({
  publishHandler,
  isOpen,
  setIsOpen,
  mySubtitles,
}: PublishSubtitlesProps) => {
  const [language, setLanguage] = useState<null | string>(null);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const { lists } = useGlobal();
  const theme = useTheme();
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newSubtitles: Subtitle[] = [];
    for (const file of acceptedFiles) {
      try {
        const newSubtitle = {
          base64: await fileToBase64(file),
          language: null,
          type: file.type,
          filename: file.name,
          size: file.size,
        };
        newSubtitles.push(newSubtitle);
      } catch (error) {
        console.error("Failed to parse audio file:", error);
      }
    }
    setSubtitles((prev) => [...newSubtitles, ...prev]);
  }, []);
  const {
    getRootProps,
    getInputProps,
  }: {
    getRootProps: () => DropzoneRootProps;
    getInputProps: () => DropzoneInputProps;
    isDragActive: boolean;
  } = useDropzone({
    onDrop,
    accept: {
      "application/x-subrip": [".srt"], // SRT subtitles
      "text/vtt": [".vtt"], // WebVTT subtitles
    },
    multiple: true,
    maxSize: 2 * 1024 * 1024, // 2MB
  });

  const onChangeValue = (field: string, data: any, index: number) => {
    const sub = subtitles[index];
    if (!sub) return;

    const copySub = { ...sub, [field]: data };

    setSubtitles((prev) => {
      const copyPrev = [...prev];
      copyPrev[index] = copySub;
      return copyPrev;
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    setSubtitles([]);
  };

  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const onDelete = useCallback(async (sub: QortalGetMetadata) => {
    let loadId;
    try {
      setIsPublishing(true);
      loadId = showLoading("Deleting subtitle...");
      await lists.deleteResource([sub]);
      showSuccess("Deleted subtitle");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Unable to delete");
    } finally {
      setIsPublishing(false);
      dismissToast(loadId);
    }
  }, []);

  const publishHandlerLocal = async (subtitles: Subtitle[]) => {
    let loadId;
    try {
      setIsPublishing(true);
      loadId = showLoading("Publishing subtitles...");
      await publishHandler(subtitles);
      showSuccess("Subtitles published");
      setSubtitles([]);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Unable to publish");
    } finally {
      dismissToast(loadId);
      setIsPublishing(false);
    }
  };

  const disableButton =
    !!subtitles.find((sub) => !sub?.language) || isPublishing;

  return (
    <Dialog
      open={isOpen}
      fullWidth={true}
      maxWidth={"md"}
      disablePortal={true}
      sx={{
        zIndex: 999990,
      }}
      slotProps={{
        paper: {
          elevation: 0,
          sx: {
            height: "600px",
            maxHeight: "100vh",
          },
        },
      }}
    >
      <DialogTitle>My Subtitles</DialogTitle>
      <IconButton
        aria-label="close"
        onClick={handleClose}
        sx={(theme) => ({
          position: "absolute",
          right: 8,
          top: 8,
        })}
      >
        <CloseIcon />
      </IconButton>
      <DialogContent
        sx={{
          "::-webkit-scrollbar": {
            width: "16px",
            height: "10px",
          },

          "::-webkit-scrollbar-thumb": {
            backgroundColor: theme.palette.primary.main,
            borderRadius: "8px",
            backgroundClip: "content-box",
            border: "4px solid transparent",
            transition: "0.3s background-color",
          },

          "::-webkit-scrollbar-thumb:hover": {
            backgroundColor: theme.palette.primary.dark,
          },
        }}
      >
        <Box sx={{ width: "100%" }}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={value}
              onChange={handleChange}
              aria-label="basic tabs example"
            >
              <Tab label="New" {...a11yProps(0)} />
              <Tab label="Existing" {...a11yProps(1)} />
            </Tabs>
          </Box>
        </Box>
        <Spacer height="25px" />
        {value === 0 && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              width: "100%",
              alignItems: "center",
            }}
          >
            <Box {...getRootProps()}>
              <Button
                sx={{
                  display: "flex",
                  gap: "10px",
                }}
                variant="contained"
              >
                <input {...getInputProps()} />
                Import subtitles
              </Button>
            </Box>
            {subtitles?.map((sub, i) => {
              return (
                <Card
                  sx={{
                    padding: "10px",
                    width: "500px",
                    maxWidth: "100%",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "1rem",
                    }}
                  >
                    {sub.filename}
                  </Typography>
                  <Spacer height="10px" />
                  <LanguageSelect
                    value={sub.language}
                    onChange={(val: string | null) =>
                      onChangeValue("language", val, i)
                    }
                  />
                  <Spacer height="10px" />
                  <Box
                    sx={{
                      justifyContent: "flex-end",
                      width: "100%",
                      display: "flex",
                    }}
                  >
                    <Button
                      onClick={() => {
                        setSubtitles((prev) => {
                          const newSubtitles = [...prev];
                          newSubtitles.splice(i, 1); // Remove 1 item at index i
                          return newSubtitles;
                        });
                      }}
                      variant="contained"
                      size="small"
                      color="secondary"
                    >
                      remove
                    </Button>
                  </Box>
                </Card>
              );
            })}
          </Box>
        )}
        {value === 1 && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              width: "100%",
              alignItems: "center",
            }}
          >
            {mySubtitles?.map((sub, i) => {
              return (
                <Card
                  key={i}
                  sx={{
                    padding: "10px",
                    width: "500px",
                    maxWidth: "100%",
                  }}
                >
                  <MySubtitle onDelete={onDelete} sub={sub} />
                </Card>
              );
            })}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {value === 0 && (
          <Button
            onClick={() => publishHandlerLocal(subtitles)}
            disabled={disableButton}
            variant="contained"
          >
            Publish
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

interface SubProps {
  sub: QortalMetadata;
  onSelect: (subtitle: Subtitle) => void;
  currentSubtrack: null | string;
}
const subtitlesStatus: Record<string, boolean> = {};

const Subtitle = ({ sub, onSelect, currentSubtrack }: SubProps) => {
  const [isReady, setIsReady] = useState(false);
  const { resource, isLoading, error, refetch } = usePublish(
    2,
    "JSON",
    sub,
    true
  );
  const isSelected = currentSubtrack === resource?.data?.language;
  const [isGettingStatus, setIsGettingStatus] = useState(true);

  const getStatus = useCallback(
    async (service: Service, name: string, identifier: string) => {
      try {
        if (subtitlesStatus[`${service}-${name}-${identifier}`]) {
          setIsReady(true);
          refetch();
          return;
        }

        const response = await requestQueueGetStatus.enqueue(
          (): Promise<string> => {
            return qortalRequest({
              action: "GET_QDN_RESOURCE_STATUS",
              identifier,
              service,
              name,
              build: false,
            });
          }
        );
        if (response?.status === "READY") {
          setIsReady(true);
          subtitlesStatus[`${service}-${name}-${identifier}`] = true;
          refetch();
        }
      } catch (error) {
      } finally {
        setIsGettingStatus(false);
      }
    },
    []
  );

  useEffect(() => {
    if (sub?.service && sub?.name && sub?.identifier) {
      getStatus(sub?.service, sub?.name, sub?.identifier);
    }
  }, [sub?.identifier, sub?.name, sub?.service]);

  return (
    <ButtonBase
      onClick={() => {
        if (resource?.data) {
          onSelect(isSelected ? null : resource?.data);
        } else {
          refetch();
        }
      }}
      sx={{
        px: 2,
        py: 1,
        "&:hover": {
          backgroundColor: "rgba(255, 255, 255, 0.1)",
        },
        width: "100%",
        justifyContent: "space-between",
      }}
    >
      {isGettingStatus && (
        <Skeleton variant="text" sx={{ fontSize: "1.25rem", width: "100%" }} />
      )}
      {!isGettingStatus && (
        <>
          <Typography>{sub?.metadata?.title}</Typography>
          {!isLoading && !error && !resource?.data ? (
            <DownloadIcon />
          ) : isLoading ? (
            <DownloadingIcon />
          ) : isSelected ? (
            <CheckIcon />
          ) : (
            <ArrowForwardIosIcon />
          )}
        </>
      )}
    </ButtonBase>
  );
};

interface MySubtitleProps {
  sub: QortalGetMetadata;
  onDelete: (subtitle: QortalGetMetadata) => void;
}
const MySubtitle = ({ sub, onDelete }: MySubtitleProps) => {
  const { resource, isLoading, error } = usePublish(2, "JSON", sub);
  return (
    <Card
      sx={{
        padding: "10px",
        width: "500px",
        maxWidth: "100%",
      }}
    >
      <Typography
        sx={{
          fontSize: "1rem",
        }}
      >
        {resource?.data?.filename}
      </Typography>
      <Spacer height="10px" />
      <Typography
        sx={{
          fontSize: "1rem",
        }}
      >
        {resource?.data?.language}
      </Typography>
      <Spacer height="10px" />
      <Box
        sx={{
          justifyContent: "flex-end",
          width: "100%",
          display: "flex",
        }}
      >
        <Button
          onClick={() => onDelete(sub)}
          variant="contained"
          size="small"
          color="secondary"
        >
          delete
        </Button>
      </Box>
    </Card>
  );
};

export const SubtitleManager = React.memo(SubtitleManagerComponent);
