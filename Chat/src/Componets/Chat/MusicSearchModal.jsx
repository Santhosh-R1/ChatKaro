import React, { useState, useEffect } from 'react';
import axiosInstance from "../../../BaseUrl"; // Your axios instance
import {
  Dialog, DialogTitle, DialogContent, TextField, Button, List, ListItem, ListItemAvatar,
  Avatar, ListItemText, IconButton, Box, CircularProgress, Typography
} from '@mui/material';
import { PlayArrow } from '@mui/icons-material';

const dialogSx = {
  "& .MuiDialog-paper": {
    fontFamily: '"Poppins", sans-serif',
    width: '90%',
    maxWidth: '500px',
    background: "rgba(44, 62, 80, 0.7)", 
    backdropFilter: "blur(20px)",
    "-webkit-backdrop-filter": "blur(20px)",
    boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: "18px", 
    color: "#f1f1f1",
  },
};

const searchButtonSx = {
  height: '56px',
  alignSelf: 'center',
  fontWeight: '600',
  fontFamily: '"Poppins", sans-serif',
  borderRadius: '12px',
  background: 'linear-gradient(45deg, #f78ca0 30%, #b279a7 90%)',
  boxShadow: '0 3px 5px 2px rgba(247, 140, 160, .3)',
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: '0 5px 10px 2px rgba(247, 140, 160, .4)',
  },
};

function MusicSearchModal({ open, onClose, onSongSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const processAndSetResults = (tracks) => {
    const playableTracks = tracks.filter(song => song && song.preview_url);
    if (playableTracks.length === 0) {
      setError("No songs found. Please try another search.");
    } else {
      setError(null);
    }
    setResults(playableTracks);
  };

  useEffect(() => {
    if (open) {
      const fetchDefaultSongs = async () => {
        setLoading(true);
        setError(null);
        setResults([]);
        try {
          const response = await axiosInstance.get('/api/jamendo/recommendations');
          processAndSetResults(response.data);
        } catch (err) {
          setError(err.response?.data?.message || "Could not load recommendations.");
        } finally {
          setLoading(false);
        }
      };
      
      fetchDefaultSongs();
    } else {
      setQuery("");
      setResults([]);
      setError(null);
    }
  }, [open]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const response = await axiosInstance.get(`/api/jamendo/search?q=${encodeURIComponent(query)}`);
      processAndSetResults(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not fetch music.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (song) => {
    onSongSelect(song); 
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} sx={dialogSx}> 
      <DialogTitle sx={{ 
        textAlign: 'center', 
        fontWeight: '600', 
        pb: 1, 
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        Share a Pookie Tune
      </DialogTitle>

      <DialogContent sx={{ pt: '20px !important' }}>
        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
           <TextField
            autoFocus
            margin="dense"
            label="Search songs or artists..."
            type="text"
            fullWidth
            variant="outlined"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{
              '& .MuiInputBase-root': {
                borderRadius: '12px',
              },
              '& label.Mui-focused': { color: '#f78ca0' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                '&.Mui-focused fieldset': { borderColor: '#f78ca0' },
              },
              input: { color: '#f1f1f1' },
              label: { color: '#b1b3b5' },
            }}
          />
          <Button type="submit" variant="contained" disabled={loading} sx={searchButtonSx}>
            Search
          </Button>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 3, gap: 1 }}>
            <CircularProgress color="inherit" />
            <Typography sx={{ color: '#b1b3b5' }}>Finding tunes...</Typography>
          </Box>
        )}
        
        {error && !loading && <Typography align="center" sx={{ color: '#ff7b7b', my: 2 }}>{error}</Typography>}

        {!loading && !error && results.length > 0 && (
            <Typography sx={{ color: '#b1b3b5', mb: 1, fontWeight: '600' }}>
              {query ? 'Search Results' : 'Popular Songs'}
            </Typography>
        )}

        <List sx={{ maxHeight: '45vh', overflowY: 'auto', pr: 1 }}>
          {results.map((song) => {
            const imageUrl = song.album.images?.[0]?.url || '';
            const artists = song.artists.map(artist => artist.name).join(', ') || 'Unknown Artist';
            return (
              <ListItem
                key={song.id}
                secondaryAction={
                  <IconButton edge="end" aria-label="play" onClick={() => handleSelect(song)} sx={{ 
                    color: '#1DB954', 
                    '&:hover': { backgroundColor: 'rgba(29, 185, 84, 0.1)' } 
                  }}>
                      <PlayArrow />
                  </IconButton>
                }
                sx={{
                  mb: 1,
                  borderRadius: '12px',
                  transition: 'background-color 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                }}
              >
                <ListItemAvatar>
                  <Avatar variant="rounded" src={imageUrl} sx={{ width: 48, height: 48, borderRadius: '8px' }} />
                </ListItemAvatar>
                <ListItemText
                  primaryTypographyProps={{ style: { fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }}
                  primary={song.name}
                  secondary={<span style={{color: '#b1b3b5'}}>{artists}</span>}
                />
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
    </Dialog>
  );
}

export default MusicSearchModal;