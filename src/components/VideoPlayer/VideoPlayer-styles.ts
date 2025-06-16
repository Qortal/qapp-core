import { styled } from "@mui/system";
import { Box } from "@mui/material";

export const VideoContainer = styled(Box)(({ theme }) => ({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  margin: 0,
  padding: 0,
  borderRadius: '12px',
  overflow: 'hidden',
  "&:focus": { outline: "none" },
}));

export const VideoElement = styled("video")(({ theme }) => ({

  background: "rgb(33, 33, 33)",

  "&:focus": {
    outline: "none !important",
    boxShadow: "none !important",
  },
  "&:focus-visible": {
    outline: "none !important",
    boxShadow: "none !important",
  },
  "&::-webkit-media-controls": {
    display: "none !important",
  },
  "&:fullscreen": {
    paddingBottom: '50px',
  },
}));

//1075 x 604
export const ControlsContainer = styled(Box)`
  width: 100%;
  position: absolute;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
background-image: linear-gradient(0deg,#000,#0000);
`;
