import { Box, Typography } from "@mui/material"
import { BarSpinner } from "./Spinners/BarSpinner/BarSpinner"

interface ListLoaderProps {
  isLoading: boolean;
  loadingMessage?: string; // Optional message while loading
  resultsLength: number;
  noResultsMessage?: string; // Optional message when no results
  children: React.ReactNode; // Required, to render the list content
}


export const ListLoader = ({ isLoading, loadingMessage, resultsLength, children, noResultsMessage }: ListLoaderProps) => {
  return (
    <>
    {isLoading && (
      <Box sx={{
        display: 'flex',
        gap: '20px',
        alignItems: 'center',
        overflow: "auto",
      }}>
        <BarSpinner width="22px" color="green" />
        <Typography>{loadingMessage || `Fetching list`}</Typography>
      </Box>
    )}
    {!isLoading && resultsLength === 0 && (
      <Typography
        style={{
          display: "block",
        }}
      >
        {noResultsMessage}
      </Typography>
    )}
    {!isLoading && resultsLength > 0 && (
      <>
      {children}
      </>
    )}
    </>
  )
}
