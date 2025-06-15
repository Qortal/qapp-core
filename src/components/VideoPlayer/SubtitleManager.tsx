import React, { useCallback, useEffect, useState } from "react";
import { QortalGetMetadata, QortalMetadata, Service } from "../../types/interfaces/resources";
import {
    alpha,
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fade,
  IconButton,
  Popover,
  Typography,
} from "@mui/material";
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import CloseIcon from "@mui/icons-material/Close";
import { useListStore } from "../../state/lists";
import { Resource, useResources } from "../../hooks/useResources";
import { useGlobal } from "../../context/GlobalProvider";
import { ENTITY_SUBTITLE, SERVICE_SUBTITLE } from "./video-player-constants";
import ISO6391, { LanguageCode } from "iso-639-1";
import LanguageSelect from "./LanguageSelect";
import {
  useDropzone,
  DropzoneRootProps,
  DropzoneInputProps,
} from "react-dropzone";
import { fileToBase64, objectToBase64 } from "../../utils/base64";
import { ResourceToPublish } from "../../types/qortalRequests/types";
import {  useListReturn } from "../../hooks/useListData";
import { usePublish } from "../../hooks/usePublish";
interface SubtitleManagerProps {
  qortalMetadata: QortalGetMetadata;
  close: () => void;
  open: boolean;
  onSelect: (subtitle: SubtitlePublishedData)=> void;
  subtitleBtnRef: any
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
const SubtitleManagerComponent = ({
  qortalMetadata,
  open,
  close,
  onSelect,
  subtitleBtnRef
}: SubtitleManagerProps) => {
  const [mode, setMode] = useState(1);
  const { lists, identifierOperations, auth } = useGlobal();
  const { fetchResources } = useResources();
  // const [subtitles, setSubtitles] = useState([])
  const subtitles = useListReturn(`subs-${qortalMetadata?.service}-${qortalMetadata?.name}-${qortalMetadata?.identifier}`)
  

  console.log('subtitles222', subtitles)
  const getPublishedSubtitles = useCallback(async () => {
    try {
      const videoId = `${qortalMetadata?.service}-${qortalMetadata?.name}-${qortalMetadata?.identifier}`;
      console.log('videoId', videoId)
      const postIdSearch = await identifierOperations.buildSearchPrefix(
        ENTITY_SUBTITLE,
        videoId,
      );
      const searchParams = {
        service: SERVICE_SUBTITLE,
        identifier: postIdSearch,
        limit: 0
      };
    const res =  await lists.fetchResources(searchParams, `subs-${videoId}`, "BASE64");
    lists.addList(`subs-${videoId}`,  res || []);
    console.log('resres2', res)
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    if (
      !qortalMetadata?.identifier ||
      !qortalMetadata?.name ||
      !qortalMetadata?.service
    )
      return;

    getPublishedSubtitles()
  }, [
    qortalMetadata?.identifier,
    qortalMetadata?.service,
    qortalMetadata?.name,
    getPublishedSubtitles,
  ]);

  const handleClose = () => {
    close();
    setMode(1);
    // setTitle("");
    // setDescription("");
    // setHasMetadata(false);
  };


  const publishHandler = async (subtitles: Subtitle[]) => {
    try {
              const videoId = `${qortalMetadata?.service}-${qortalMetadata?.name}-${qortalMetadata?.identifier}`;

        const identifier = await identifierOperations.buildIdentifier(ENTITY_SUBTITLE, videoId);
                const name = auth?.name
console.log('identifier2', identifier)
        if(!name) return
        const resources: ResourceToPublish[] = []
        const tempResources: {qortalMetadata: QortalMetadata, data: any}[] = []
        for(const sub of subtitles ){
            const data = {
                subtitleData: sub.base64,
                language: sub.language,
                filename: sub.filename,
                type: sub.type
            }
            
            const base64Data = await objectToBase64(data)
            const resource = {
                name,
                identifier,
                service: SERVICE_SUBTITLE,
                base64: base64Data,
                filename: sub.filename,
                title: sub.language || undefined
            }
            resources.push(resource)
            tempResources.push({
                qortalMetadata: {
                     identifier,
                service: SERVICE_SUBTITLE,
                    name,
                    size: 100,
                    created: Date.now()
                },
                data: data,
            })
        }
                console.log('resources', resources)

        await qortalRequest({
            action: 'PUBLISH_MULTIPLE_QDN_RESOURCES',
            resources
        })

       
        lists.addNewResources(`subs-${qortalMetadata?.service}-${qortalMetadata?.name}-${qortalMetadata?.identifier}`, tempResources)
    } catch (error) {
        
    }
  };
  const onBack = ()=> {
    if(mode === 1) close()
  }

  const onSelectHandler = (sub: SubtitlePublishedData)=> {
    onSelect(sub)
    close()
  }
  return (
    <Popover
        open={!!open}
        anchorEl={subtitleBtnRef.current}
        onClose={handleClose}
        slots={{
          transition: Fade,
        }}
        slotProps={{
          transition: {
            timeout: 200,
          },
          paper: {
            sx: {
              bgcolor: alpha('#181818', 0.98),
              color: 'white',
              opacity: 0.9,
              borderRadius: 2,
              boxShadow: 5,
              p: 1,
              minWidth: 200,
            },
          },
        }}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
      >
        <Box sx={{
            padding: '5px 0px 10px 0px',
            display: 'flex',
            gap:'10px',
            width: '100%'
        }}>
            <ButtonBase onClick={onBack}>
                <ArrowBackIosIcon sx={{
                    fontSize: '1.15em'
                }}/>
            </ButtonBase>
            <ButtonBase>
            <Typography onClick={onBack} sx={{
                fontSize: '0.85rem'
            }}>Subtitles</Typography>
           
    </ButtonBase>
     <ButtonBase sx={{
                marginLeft: 'auto',
                
            }}>
                <ModeEditIcon sx={{
                    fontSize: '1.15rem'
                }} />
            </ButtonBase>
        </Box>
        <Divider />
              {mode === 1 && (
        <PublisherSubtitles
          subtitles={subtitles}
          publisherName={qortalMetadata.name}
          setMode={setMode}
          onSelect={onSelectHandler}
          onBack={onBack}
        />
      )}
        {/* <Box>
          {[
            'Ambient mode',
            'Annotations',
            'Subtitles/CC',
            'Sleep timer',
            'Playback speed',
            'Quality',
          ].map((label) => (
            <Typography
              key={label}
              sx={{
                px: 2,
                py: 1,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                },
              }}
            >
              {label}
            </Typography>
          ))}
        </Box> */}
      </Popover>
    // <Dialog
    //   open={!!open}
    //   fullWidth={true}
    //   maxWidth={"md"}
    //   sx={{
    //     zIndex: 999990,
    //   }}
    //   slotProps={{
    //     paper: {
    //       elevation: 0,
    //     },
    //   }}
    // >
    //   <DialogTitle>Subtitles</DialogTitle>
    //   <IconButton
    //     aria-label="close"
    //     onClick={handleClose}
    //     sx={(theme) => ({
    //       position: "absolute",
    //       right: 8,
    //       top: 8,
    //     })}
    //   >
    //     <CloseIcon />
    //   </IconButton>
    //   <Button onClick={() => setMode(5)}>New subtitles</Button>
    //   {mode === 1 && (
    //     <PublisherSubtitles
    //       subtitles={subtitles}
    //       publisherName={qortalMetadata.name}
    //       setMode={setMode}
    //       onSelect={onSelect}
    //     />
    //   )}
    //   {mode === 5 && <PublishSubtitles publishHandler={publishHandler} />}
    //   {/* {mode === 2 && (
    //     <CommunitySubtitles
    //       link={open?.link}
    //       name={open?.name}
    //       mode={mode}
    //       setMode={setMode}
    //       username={username}
    //       category={open?.category}
    //       rootName={open?.rootName}
    //     />
    //   )}

    //   {mode === 4 && (
    //     <MySubtitles
    //       link={open?.link}
    //       name={open?.name}
    //       mode={mode}
    //       setMode={setMode}
    //       username={username}
    //       title={title}
    //       description={description}
    //       setDescription={setDescription}
    //       setTitle={setTitle}
    //     />
    //   )} */}
    // </Dialog>
  );
};

interface PublisherSubtitlesProps {
  publisherName: string;
  subtitles: any[];
  setMode: (val: number) => void;
  onSelect: (subtitle: any) => void;
  onBack: ()=> void;
}

const PublisherSubtitles = ({
  publisherName,
  subtitles,
  setMode,
  onSelect,
  onBack
}: PublisherSubtitlesProps) => {

    
  return (
    <>
     
            {subtitles?.map((sub)=> {
                return <Subtitle onSelect={onSelect} sub={sub} key={`${sub?.qortalMetadata?.service}-${sub?.qortalMetadata?.name}-${sub?.qortalMetadata?.identifier}`}/>
            })}
          
       
    </>
  );
};

interface PublishSubtitlesProps {
    publishHandler: (subs: Subtitle[])=> void
}



const PublishSubtitles = ({ publishHandler }: PublishSubtitlesProps) => {
  const [language, setLanguage] = useState<null | string>(null);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
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
        newSubtitles.push(newSubtitle)
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
console.log('subtitles', subtitles)

  return (
    <>
      <DialogContent>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            width: "100%",
            alignItems: "flex-start",
          }}
        >
           <Box {...getRootProps()}>
          <Button
            sx={{
              display: 'flex',
              gap: '10px',
            }}
            variant="contained"
          >
            <input {...getInputProps()} />
            Import subtitles
          </Button>
        </Box>
          {subtitles?.map((sub, i) => {
            return (
              <>
                <LanguageSelect
                  value={sub.language}
                  onChange={(val: string | null) => onChangeValue('language',val, i)}
                />
              </>
            );
          })}
        </Box>
      </DialogContent>
       <DialogActions>
              <Button
                onClick={()=> publishHandler(subtitles)}
                // disabled={disableButton}
                variant="contained"
              >
                Publish index
              </Button>
            </DialogActions>
    </>
  );
};

interface SubProps {
    sub: QortalGetMetadata
    onSelect: (subtitle: Subtitle)=> void;
}
const Subtitle = ({sub, onSelect}: SubProps)=> {
    const {resource, isLoading } = usePublish(2, 'JSON', sub)
    console.log('resource', resource)
    return   <Typography
   onClick={()=> onSelect(resource?.data)}
            
              sx={{
                px: 2,
                py: 1,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                },
              }}
            >
             {resource?.data?.language}
            </Typography>
}

  export const SubtitleManager = React.memo(SubtitleManagerComponent);
