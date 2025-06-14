import { useCallback, useEffect, useState } from "react"
import { QortalGetMetadata } from "../../types/interfaces/resources"
import { Box, ButtonBase, Dialog, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material"
import CloseIcon from "@mui/icons-material/Close";
import { useListStore } from "../../state/lists";
import { useResources } from "../../hooks/useResources";
import { useGlobal } from "../../context/GlobalProvider";
interface SubtitleManagerProps {
    qortalMetadata: QortalGetMetadata
    close: ()=> void
    open: boolean
}
export const SubtitleManager = ({qortalMetadata, open, close}: SubtitleManagerProps) => {
    const [mode, setMode] = useState(1)
    const {lists} = useGlobal()
    const  {fetchResources} = useResources()
    // const [subtitles, setSubtitles] = useState([])
     const subtitles = useListStore(
  (state) => state.lists[`${qortalMetadata?.service}- ${qortalMetadata?.name}-${qortalMetadata?.identifier}`]?.items || []
);
    const getPublishedSubtitles = useCallback(async ()=> {
        try {
                    await fetchResources(qortalMetadata, `${qortalMetadata?.service}- ${qortalMetadata?.name}-${qortalMetadata?.identifier}`, "BASE64");

        } catch (error) {
             console.error(error)
        }
    }, [])
    
    useEffect(()=> {
        if(!qortalMetadata?.identifier || !qortalMetadata?.name || !qortalMetadata?.service) return

        // getPublishedSubtitles()
    }, [qortalMetadata?.identifier, qortalMetadata?.service, qortalMetadata?.name, getPublishedSubtitles])

     const handleClose = () => {
    close()
    setMode(1);
    // setTitle("");
    // setDescription("");
    // setHasMetadata(false);
  };

  const onSelect = ()=> {

  }
  return (
    <Dialog
      open={!!open}
      fullWidth={true}
      maxWidth={"md"}
      sx={{
        zIndex: 999990,
      }}
      slotProps={{
        paper: {
          elevation: 0,
        },
      }}
    >
      <DialogTitle>Subtitles</DialogTitle>
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
      {mode === 1 && (
        <PublisherSubtitles
          subtitles={subtitles}
          publisherName={qortalMetadata.name}
          setMode={setMode}
          onSelect={onSelect}
        />
      )}
      {/* {mode === 2 && (
        <CommunitySubtitles
          link={open?.link}
          name={open?.name}
          mode={mode}
          setMode={setMode}
          username={username}
          category={open?.category}
          rootName={open?.rootName}
        />
      )}

      {mode === 4 && (
        <MySubtitles
          link={open?.link}
          name={open?.name}
          mode={mode}
          setMode={setMode}
          username={username}
          title={title}
          description={description}
          setDescription={setDescription}
          setTitle={setTitle}
        />
      )} */}
    </Dialog>
  )
}

interface PublisherSubtitlesProps {
    publisherName: string
    subtitles: any[]
    setMode: (val: number)=> void
    onSelect: (subtitle: any)=> void
}

const PublisherSubtitles = ({
  publisherName,
  subtitles,
  setMode,
  onSelect,
}: PublisherSubtitlesProps) => {

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
          <ButtonBase
            sx={{
              width: "100%",
            }}
            onClick={() => setMode(2)}
          >
            <Box
              sx={{
                p: 2,
                border: "2px solid",
                borderRadius: 2,
                width: "100%",
              }}
            >
              <Typography>Create new index</Typography>
            </Box>
          </ButtonBase>

       
        </Box>
      </DialogContent>
    </>
  );
};