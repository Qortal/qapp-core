import { Box, Typography } from "@mui/material";
import { BarSpinner } from "./Spinners/BarSpinner/BarSpinner";
import { CSSProperties } from "react";

interface ListLoaderProps {
  isLoading: boolean;
  loadingMessage?: string; // Optional message while loading
  resultsLength: number;
  noResultsMessage?: string; // Optional message when no results
  children: React.ReactNode; // Required, to render the list content
  loaderList?:  (status: "LOADING" | "NO_RESULTS") => React.ReactNode; // Function type
  loaderHeight?: CSSProperties
}

export const ListLoader = ({
  isLoading,
  loadingMessage,
  resultsLength,
  children,
  noResultsMessage,
  loaderList,
  loaderHeight
}: ListLoaderProps) => {
  return (
    <>
      {loaderList && isLoading && (
        <>
        {loaderList("LOADING")}
        </>
      )}
      {loaderList && !isLoading && resultsLength === 0 && (
        <>
        {loaderList("NO_RESULTS")}
        </>
      )}
      {!loaderList && isLoading && (
        <Box
          sx={{
            display: "flex",
            gap: "20px",
            alignItems: "center",
            overflow: "auto",
            height: loaderHeight || "auto"
          }}
        >
          <BarSpinner width="22px" color="green" />
          <Typography>{loadingMessage || `Fetching list`}</Typography>
        </Box>
      )}
      {!loaderList && !isLoading && resultsLength === 0 && (
        <Typography
          style={{
            display: "block",
          }}
        >
          {noResultsMessage}
        </Typography>
      )}
      {!isLoading && resultsLength > 0 && <>{children}</>}
    </>
  );
};
