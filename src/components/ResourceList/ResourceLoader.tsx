import { Box, Typography } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { BarSpinner } from "../../common/Spinners/BarSpinner/BarSpinner";
interface PropsResourceLoader {
  status?: string;
  message?: string;
}

export const ResourceLoader = ({ status, message }: PropsResourceLoader) => {
  return (
    <Box
      sx={{
        display: "flex",
        gap: "20px",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
      }}
    >
      {status === "loading" && (
        <>
          <BarSpinner width="22px" color="green" />
          <Typography>
            {message || `Fetching Content...`}
          </Typography>
        </>
      )}
      {status === "error" && (
        <>
          <ErrorOutlineIcon
            width="22px"
            style={{
              color: "green",
            }}
          />
          <Typography>
            {message || `Content Unavailable Now... Please try again later.`}
          </Typography>
        </>
      )}
    </Box>
  );
};
