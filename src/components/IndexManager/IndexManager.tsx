import {
    Avatar,
  Box,
  Breadcrumbs,
  Button,
  ButtonBase,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { IndexCategory, useIndexStore } from "../../state/indexes";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import { hashWordWithoutPublicSalt } from "../../utils/encryption";
import { usePublish } from "../../hooks/usePublish";
import {
  dismissToast,
  showError,
  showLoading,
  showSuccess,
} from "../../utils/toast";
import { objectToBase64 } from "../../utils/base64";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { OptionsManager } from "../OptionsManager";
import ShortUniqueId from "short-unique-id";
import { Spacer } from "../../common/Spacer";
import { useModal } from "../useModal";
import { createAvatarLink } from "../../utils/qortal";
import { extractComponents } from "../../utils/text";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { useLibTranslation } from "../../hooks/useLibTranslation";
import { t } from "i18next";

const uid = new ShortUniqueId({ length: 10, dictionary: "alphanum" });

interface PropsMode {
  link: string;
  name: string;
  mode: number;
  setMode: (mode: number) => void;
  username: string;
}

interface PropsIndexManager {
  username: string | null;
}

const cleanString = (str: string) => str.replace(/\s{2,}/g, ' ').trim().toLocaleLowerCase();

export const IndexManager = ({ username }: PropsIndexManager) => {
    const { t } = useLibTranslation();
  
  const open = useIndexStore((state) => state.open);
  const setOpen = useIndexStore((state) => state.setOpen);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hasMetadata, setHasMetadata] = useState(false);
  const [mode, setMode] = useState(1);
  const publish = usePublish();
  const handleClose = () => {
    setOpen(null);
    setMode(1);
    setTitle("");
    setDescription("");
    setHasMetadata(false);
  };

  const getMetadata = useCallback(async (name: string, link: string) => {
    try {
      const identifierWithoutHash = name + link;
      const identifier = await hashWordWithoutPublicSalt(
        identifierWithoutHash,
        20
      );
      const rawData = await publish.fetchPublish(
        {
          name: name,
          service: "METADATA",
          identifier,
        }
      );

      if (
        rawData?.resource &&
        rawData?.resource?.data?.title &&
        rawData?.resource?.data?.description
      ) {
        setHasMetadata(true);
        setDescription(rawData?.resource?.data?.description);
        setTitle(rawData?.resource?.data?.title);
      }
    } catch (error) {}
  }, []);

  useEffect(() => {
    if (open?.name && open?.link) {
      setTimeout(() => {
        getMetadata(open?.name, open?.link);
      }, 100);
    }
  }, [open?.link, open?.name]);

  if (!open || !username) return null;

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
      <DialogTitle>{t("index.title")}</DialogTitle>
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
        <EntryMode
          link={open?.link}
          name={open?.name}
          mode={mode}
          setMode={setMode}
          username={username}
          hasMetadata={hasMetadata}
        />
      )}
      {mode === 2 && (
        <CreateIndex
          link={open?.link}
          name={open?.name}
          mode={mode}
          setMode={setMode}
          username={username}
          category={open?.category}
          rootName={open?.rootName}
        />
      )}
      {/* {mode === 3 && (
         <YourIndices
         link={open?.link}
         name={open?.name}
         mode={mode}
         setMode={setMode}
         username={username}
         category={open?.category}
         rootName={open?.rootName}
       />
      )} */}
      {mode === 4 && (
        <AddMetadata
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
      )}
    </Dialog>
  );
};

interface PropsEntryMode extends PropsMode {
  hasMetadata: boolean;
}

const EntryMode = ({
  link,
  name,
  mode,
  setMode,
  username,
  hasMetadata,
}: PropsEntryMode) => {
      const { t } = useLibTranslation();

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
              <Typography>{t("index.create_new_index")}</Typography>
            </Box>
          </ButtonBase>
          {/* <ButtonBase
            sx={{
              width: "100%",
            }}
          >
            <Box
              sx={{
                p: 2,
                border: "2px solid",
                borderRadius: 2,
                width: "100%",
              }}
            >
              <Typography>Your indices</Typography>
            </Box>
          </ButtonBase> */}
          <ButtonBase
            sx={{
              width: "100%",
              visibility: username === name ? 'visible' : 'hidden'
            }}
            onClick={() => setMode(4)}
          >
            <Box
              sx={{
                p: 2,
                border: "2px solid",
                borderRadius: 2,
                width: "100%",
                gap: "20px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Typography>{t("index.add_metadata")}</Typography>
              {hasMetadata && <CheckCircleIcon color="success" />}
            </Box>
          </ButtonBase>
        </Box>
      </DialogContent>
    </>
  );
};

interface PropsAddMetadata extends PropsMode {
  title: string;
  description: string;
  setTitle: (val: string) => void;
  setDescription: (val: string) => void;
}

const AddMetadata = ({
  link,
  name,
  mode,
  setMode,
  username,
  title,
  description,
  setDescription,
  setTitle,
}: PropsAddMetadata) => {
      const { t } = useLibTranslation();

  const publish = usePublish();

  const disableButton = !title.trim() || !description.trim() || !name || !link;

  const createMetadata = async () => {
    const loadId = showLoading(t("index.publishing_metadata"));
    try {
      const identifierWithoutHash = name + link;
      const identifier = await hashWordWithoutPublicSalt(
        identifierWithoutHash,
        20
      );
      const objectToPublish = {
        title,
        description,
      };
      const toBase64 = await objectToBase64(objectToPublish);
      const res = await qortalRequest({
        action: "PUBLISH_QDN_RESOURCE",
        service: "METADATA",
        identifier: identifier,
        data64: toBase64,
      });

      if (res?.signature) {
        showSuccess(t("index.published_metadata"));
        publish.updatePublish(
          {
            identifier,
            service: "METADATA",
            name: username,
          },
          objectToPublish
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("index.failed_metadata");
      showError(message);
    } finally {
      dismissToast(loadId);
    }
  };

  const res = extractComponents(link || "");
        const appName = res?.name || "";

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
          <IconButton disabled={mode === 1} onClick={() => setMode(1)}>
            <ArrowBackIosIcon />
          </IconButton>
          <Typography>{t("index.example")}</Typography>
          <Card sx={{
            width: '100%',
            padding: '5px'
          }}>
          <Box  sx={{ mb: 3, display: "flex", gap: 2, width: "100%" }}>
            <Avatar
              alt={appName}
              src={createAvatarLink(appName)}
              variant="square"
              sx={{ width: 24, height: 24, mt: 0.5 }}
            />
            <Box
              sx={{
                width: "calc(100% - 50px)",
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start'
                }}
              >
                <Breadcrumbs
                  separator={<NavigateNextIcon fontSize="small" />}
                  aria-label="breadcrumb"
                >
                  <Typography variant="body2" color="text.secondary">
                    {res?.service}
                  </Typography>
                  <Typography
                    sx={{
                      textAlign: "start",
                    }}
                    variant="body2"
                    color="text.secondary"
                  >
                    {appName}
                  </Typography>
                  <Typography
                    sx={{
                      textAlign: "start",
                    }}
                    variant="body2"
                    color="text.secondary"
                  >
                    {res?.path}
                  </Typography>
                </Breadcrumbs>
              </Box>
              <Spacer height="10px" />
              <Box
                sx={{
                  width: "100%",
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    display: "block",
                    textDecoration: "none",
                    width: "100%",
                    textAlign: "start",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  {title}
                </Typography>
              </Box>
              <Typography
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                variant="body2"
                color="text.secondary"
              >
                {description}
              </Typography>
            </Box>
          </Box>
          </Card>
          <Box>
            <Typography>{t("index.metadata.title")}</Typography>
            <TextField
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              size="small"
              placeholder={t("index.metadata_title_placeholder")}
              slotProps={{
                htmlInput: { maxLength: 50 },
              }}
              fullWidth
              helperText={
                <Typography
                  variant="caption"
                  color={title.length >= 50 ? "error" : "text.secondary"}
                >
                  {title.length}/{50} {` ${t("index.characters")}`}
                </Typography>
              }
            />
          </Box>
          <Box>
            <Typography>{t("index.metadata.description")}</Typography>
            <TextField
              fullWidth
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              size="small"
              placeholder={t("index.metadata_description_placeholder")}
              slotProps={{
                htmlInput: { maxLength: 120 },
              }}
              helperText={
                <Typography
                  variant="caption"
                  color={description.length >= 120 ? "error" : "text.secondary"}
                >
                  {description.length}/{120} {` ${t("index.characters")}`}
                </Typography>
              }
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={createMetadata}
          disabled={disableButton}
          variant="contained"
        >
          {t("actions.publish_metadata")}
        </Button>
      </DialogActions>
    </>
  );
};

interface PropsCreateIndex extends PropsMode {
  category: IndexCategory;
  rootName: string;
}

const CreateIndex = ({
  link,
  name,
  mode,
  setMode,
  username,
  category,
  rootName,
}: PropsCreateIndex) => {
      const { t } = useLibTranslation();

  const [terms, setTerms] = useState<string[]>([]);
  const publish = usePublish();
  const [size, setSize] = useState(0);
  const [fullSize, setFullSize] = useState(0);
  const { isShow, onCancel, onOk, show } = useModal();
  const [recommendedIndices, setRecommendedIndices] = useState([])
  const [recommendedSelection, setRecommendedSelection] = useState("")

 
  const objectToPublish = useMemo(() => {
    if(recommendedSelection){
        return [
            {
                n: name,
                t: cleanString(recommendedSelection),
                c: category,
                l: link, 
            }
        ]
    }
    return terms?.map((term) => {
      return {
        n: name,
        t: cleanString(term),
        c: category,
        l: link,
      };
    });
  }, [name, terms, category, link, recommendedSelection]);
  const objectToCalculateSize = useMemo(() => {
    return [
      {
        n: name,
        t: "",
        c: category,
        l: link,
      },
    ];
  }, [name, category, link]);

  const shouldRecommendMax = !recommendedSelection && terms?.length === 1 && 230 - size > 50;
  const recommendedSize = 230 - size;

  useEffect(() => {
    const getSize = async (data: any, data2: any) => {
      try {
        const toBase64 = await objectToBase64(data);
        const size = toBase64?.length;
        setSize(size);
        const toBase642 = await objectToBase64(data2);
        const size2 = toBase642?.length;
        setFullSize(size2);
      } catch (error) {}
    };
    getSize(objectToCalculateSize, objectToPublish);
  }, [objectToCalculateSize, objectToPublish]);

  const getRecommendedIndices = useCallback(async (nameParam: string, linkParam: string, rootNameParam: string)=> {
    try {
        const hashedRootName = await hashWordWithoutPublicSalt(rootNameParam, 20);
        const hashedLink = await hashWordWithoutPublicSalt(linkParam, 20);
        const identifier = `idx-${hashedRootName}-${hashedLink}-`;
      const res = await fetch(`/arbitrary/indices/${nameParam}/${identifier}`)
      const data = await res.json()
      const uniqueByTerm = data.filter(
        (item: any, index: number, self: any) =>
          index === self.findIndex((t: any) => t.term === item.term)
      );
      setRecommendedIndices(uniqueByTerm)
    } catch (error) {
        
    }
  }, [])
  useEffect(()=> {
    if(name && link && rootName){
        getRecommendedIndices(name, link, rootName)
    }
  }, [name, link, rootName, getRecommendedIndices])
  const disableButton = (terms.length === 0 && !recommendedSelection) || !name || !link;

  const createIndex = async () => {
    const loadId = showLoading(t("index.publishing_index"));
    try {
      const hashedRootName = await hashWordWithoutPublicSalt(rootName, 20);
      const hashedLink = await hashWordWithoutPublicSalt(link, 20);
      const randomUid = uid.rnd();
      const identifier = `idx-${hashedRootName}-${hashedLink}-${randomUid}`;
      const toBase64 = await objectToBase64(objectToPublish);
      const res = await qortalRequest({
        action: "PUBLISH_QDN_RESOURCE",
        service: "JSON",
        identifier: identifier,
        data64: toBase64,
      });

      if (res?.signature) {
        showSuccess(t("index.published_index"));
        publish.updatePublish(
          {
            identifier,
            service: "JSON",
            name: username,
          },
          objectToPublish
        );
        setTerms([]);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("index.failed_index");
      showError(message);
    } finally {
      dismissToast(loadId);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRecommendedSelection((event.target as HTMLInputElement).value);
  };


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
          <IconButton disabled={mode === 1} onClick={() => setMode(1)}>
            <ArrowBackIosIcon />
          </IconButton>
          {recommendedIndices?.length > 0 && (
            <>
            <Typography>{t("index.recommended_indices")}</Typography>
              <RadioGroup
        aria-labelledby="demo-controlled-radio-buttons-group"
        name="controlled-radio-buttons-group"
        value={recommendedSelection}
        onChange={handleChange}
      >
        {recommendedIndices?.map((ri: any, i)=> {
            return   <FormControlLabel key={i} value={ri?.term} control={<Radio />} label={ri?.term} />
        })}
         </RadioGroup>
         <Divider sx={{
            width: '100%'
         }} />
            </>
          )}
        
      
     
          <Box sx={{
            width: '100%'
          }}>
          <RadioGroup
        aria-labelledby="demo-controlled-radio-buttons-group"
        name="controlled-radio-buttons-group"
        value={recommendedSelection}
        onChange={handleChange}
      >
            <FormControlLabel value="" control={<Radio />} label={t("index.add_search_term")} />
            </RadioGroup>
            <Spacer height="10px" />
            {!recommendedSelection && (
                <OptionsManager
                maxLength={17}
                items={terms}
                onlyStrings
                label={t("index.search_terms")}
                setItems={async (termsNew: string[]) => {
                  try {
                    if (terms?.length === 1 && termsNew?.length === 2) {
                      await show({
                        message: "",
                      });
                    }
                    setTerms(termsNew);
                  } catch (error) {
                    //error
                  }
                }}
              />
            )}
            
            <Spacer height="10px" />
            <Typography
              sx={{
                visibility:
                  shouldRecommendMax && fullSize > 230 ? "visible" : "hidden",
              }}
            >

               {t("index.recommendation_size", {
                recommendedSize
              })}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={createIndex}
          disabled={disableButton}
          variant="contained"
        >
          {t("actions.publish_index")}
        </Button>
      </DialogActions>
      <Dialog
        open={isShow}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        sx={{
          zIndex: 999991,
        }}
        slotProps={{
          paper: {
            elevation: 1,
          },
        }}
      >
        <DialogTitle id="alert-dialog-title">
           {t("index.multiple_title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {t("index.multiple_description")}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onCancel}>{t("actions.cancel")}</Button>
          <Button variant="contained" onClick={onOk}>
           {t("actions.continue")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};


const YourIndices = ({
    link,
    name,
    mode,
    setMode,
    username,
    category,
    rootName,
  }: PropsCreateIndex) => {
        const { t } = useLibTranslation();

    const [terms, setTerms] = useState<string[]>([]);
    const publish = usePublish();
    const [size, setSize] = useState(0);
    const [fullSize, setFullSize] = useState(0);
    const { isShow, onCancel, onOk, show } = useModal();
    const [recommendedIndices, setRecommendedIndices] = useState([])
    const [recommendedSelection, setRecommendedSelection] = useState("")
    const objectToPublish = useMemo(() => {
      if(recommendedSelection){
          return [
              {
                  n: name,
                  t: recommendedSelection.toLocaleLowerCase(),
                  c: category,
                  l: link, 
              }
          ]
      }
      return terms?.map((term) => {
        return {
          n: name,
          t: term.toLocaleLowerCase(),
          c: category,
          l: link,
        };
      });
    }, [name, terms, category, link, recommendedSelection]);
    const objectToCalculateSize = useMemo(() => {
      return [
        {
          n: name,
          t: "",
          c: category,
          l: link,
        },
      ];
    }, [name, category, link]);
  
    const shouldRecommendMax = !recommendedSelection && terms?.length === 1 && 230 - size > 50;
    const recommendedSize = 230 - size;
  
    useEffect(() => {
      const getSize = async (data: any, data2: any) => {
        try {
          const toBase64 = await objectToBase64(data);
          const size = toBase64?.length;
          setSize(size);
          const toBase642 = await objectToBase64(data2);
          const size2 = toBase642?.length;
          setFullSize(size2);
        } catch (error) {}
      };
      getSize(objectToCalculateSize, objectToPublish);
    }, [objectToCalculateSize, objectToPublish]);
  
    const getYourIndices = useCallback(async (nameParam: string, linkParam: string, rootNameParam: string)=> {
      try {
          const hashedRootName = await hashWordWithoutPublicSalt(rootNameParam, 20);
          const hashedLink = await hashWordWithoutPublicSalt(linkParam, 20);
          const identifier = `idx-${hashedRootName}-${hashedLink}-`;
        const res = await fetch(`/arbitrary/indices/${nameParam}/${identifier}`)
        const data = await res.json()
        
        setRecommendedIndices(data)
      } catch (error) {
          
      }
    }, [])
    useEffect(()=> {
      if(username && link && rootName){
          getYourIndices(username, link, rootName)
      }
    }, [username, link, rootName, getYourIndices])
    const disableButton = (terms.length === 0 && !recommendedSelection) || !name || !link;
  
    const createIndex = async () => {
      const loadId = showLoading("Publishing index...");
      try {
        const hashedRootName = await hashWordWithoutPublicSalt(rootName, 20);
        const hashedLink = await hashWordWithoutPublicSalt(link, 20);
        const randomUid = uid.rnd();
        const identifier = `idx-${hashedRootName}-${hashedLink}-${randomUid}`;
        const toBase64 = await objectToBase64(objectToPublish);
        const res = await qortalRequest({
          action: "PUBLISH_QDN_RESOURCE",
          service: "JSON",
          identifier: identifier,
          data64: toBase64,
        });
  
        if (res?.signature) {
          showSuccess("Successfully published index");
          publish.updatePublish(
            {
              identifier,
              service: "JSON",
              name: username,
            },
            objectToPublish
          );
          setTerms([]);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to publish index";
        showError(message);
      } finally {
        dismissToast(loadId);
      }
    };
  
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setRecommendedSelection((event.target as HTMLInputElement).value);
    };
  
  
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
            <IconButton disabled={mode === 1} onClick={() => setMode(1)}>
              <ArrowBackIosIcon />
            </IconButton>
            {recommendedIndices?.length > 0 && (
              <>
              <Typography>Recommended Indices</Typography>
                <RadioGroup
          aria-labelledby="demo-controlled-radio-buttons-group"
          name="controlled-radio-buttons-group"
          value={recommendedSelection}
          onChange={handleChange}
        >
          {recommendedIndices?.map((ri: any, i)=> {
              return   <FormControlLabel key={i} value={ri?.term} control={<Radio />} label={ri?.term} />
          })}
           </RadioGroup>
           <Divider sx={{
              width: '100%'
           }} />
              </>
            )}
          
        
       
            <Box sx={{
            width: '100%'
          }}>
            <RadioGroup
          aria-labelledby="demo-controlled-radio-buttons-group"
          name="controlled-radio-buttons-group"
          value={recommendedSelection}
          onChange={handleChange}
        >
              <FormControlLabel value="" control={<Radio />} label="Add search term" />
              </RadioGroup>
              <Spacer height="10px" />
              {!recommendedSelection && (
                  <OptionsManager
                  maxLength={17}
                  items={terms}
                  onlyStrings
                  label="search terms"
                  setItems={async (termsNew: string[]) => {
                    try {
                      if (terms?.length === 1 && termsNew?.length === 2) {
                        await show({
                          message: "",
                        });
                      }
                      setTerms(termsNew);
                    } catch (error) {
                      //error
                    }
                  }}
                />
              )}
              
              <Spacer height="10px" />
              <Typography
                sx={{
                  visibility:
                    shouldRecommendMax && fullSize > 230 ? "visible" : "hidden",
                }}
              >
                It is recommended to keep your term character count below{" "}
                {recommendedSize} characters
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={createIndex}
            disabled={disableButton}
            variant="contained"
          >
            Publish index
          </Button>
        </DialogActions>
        <Dialog
          open={isShow}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
          sx={{
            zIndex: 999991,
          }}
          slotProps={{
            paper: {
              elevation: 1,
            },
          }}
        >
          <DialogTitle id="alert-dialog-title">
            Adding multiple indices
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              Subsequent indices will keep your publish fees lower, but they will
              have less strength in future search results.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button variant="contained" onClick={onCancel}>Cancel</Button>
            <Button variant="contained" onClick={onOk}>
              Continue
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  };