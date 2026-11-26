import React, { useState, useEffect } from 'react';
import axiosInstance from "../../../BaseUrl"; 
import {
  Dialog, DialogTitle, DialogContent, TextField, Button, List, ListItem, ListItemAvatar,
  Avatar, ListItemText, IconButton, Box, CircularProgress, Typography
} from '@mui/material';
import { PlayArrow } from '@mui/icons-material';

const dialogSx = {
  "& .MuiBackdrop-root": {
    backgroundColor: "rgba(12, 3, 18, 0.75)",
    backdropFilter: "blur(12px)",
  },
  "& .MuiDialog-paper": {
    fontFamily: '"Poppins", sans-serif',
    width: '90%',
    maxWidth: '480px',
    background: "rgba(32, 12, 44, 0.94)", 
    backdropFilter: "blur(25px) saturate(180%)",
    "-webkit-backdrop-filter": "blur(25px) saturate(180%)",
    boxShadow: "0 25px 65px rgba(6, 1, 14, 0.8), 0 0 35px rgba(247, 140, 160, 0.25)",
    border: "1px solid rgba(247, 140, 160, 0.35)",
    borderRadius: "26px", 
    color: "#f1f1f1",
    padding: "12px 6px",
    overflow: "hidden",
  },
};

const searchButtonSx = {
  height: '52px',
  alignSelf: 'center',
  fontWeight: '600',
  fontFamily: '"Poppins", sans-serif',
  borderRadius: '16px',
  textTransform: 'none',
  px: 3,
  background: 'linear-gradient(135deg, #f78ca0 0%, #f9748f 100%)',
  boxShadow: '0 4px 16px rgba(247, 140, 160, 0.4)',
  transition: 'all 0.25s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
    background: 'linear-gradient(135deg, #ff9a9e 0%, #f78ca0 100%)',
    boxShadow: '0 6px 22px rgba(247, 140, 160, 0.6)',
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
      <div className="cuteDialog__icon">
        <span className="cuteDialog__iconMain">🎵</span>
        <span className="cuteDialog__iconSub">💕</span>
      </div>
      <DialogTitle className="cuteDialog__title">
        Share a Romantic Tune
      </DialogTitle>
      <div className="cuteDialog__divider">
        <span className="cuteDialog__dividerLine"></span>
        <span className="cuteDialog__dividerHeart">♥</span>
        <span className="cuteDialog__dividerLine"></span>
      </div>

      <DialogContent sx={{ px: '20px', pt: '8px !important' }}>
        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
           <TextField
            autoFocus
            margin="dense"
            label="Search songs or artists..."
            placeholder="e.g. Love, Romantic, Chill..."
            type="text"
            fullWidth
            variant="outlined"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{
              '& .MuiInputBase-root': {
                borderRadius: '16px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
              },
              '& label.Mui-focused': { color: '#f78ca0' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'rgba(247, 140, 160, 0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(247, 140, 160, 0.6)' },
                '&.Mui-focused fieldset': { borderColor: '#f78ca0', borderWidth: '2px' },
              },
              input: { color: '#ffffff' },
              label: { color: 'rgba(255, 215, 230, 0.7)' },
            }}
          />
          <Button type="submit" variant="contained" disabled={loading} sx={searchButtonSx}>
            Search
          </Button>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4, gap: 1.5 }}>
            <CircularProgress sx={{ color: '#f78ca0' }} size={36} />
            <Typography sx={{ color: 'rgba(255, 230, 240, 0.75)', fontSize: '0.9rem' }}>Finding romantic tunes for you two... 💕</Typography>
          </Box>
        )}
        
        {error && !loading && <Typography align="center" sx={{ color: '#ff758c', my: 2 }}>{error}</Typography>}

        {!loading && !error && results.length > 0 && (
            <Typography sx={{ color: '#f78ca0', mb: 1, fontWeight: '600', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
              {query ? 'SEARCH RESULTS' : 'POPULAR ROMANTIC SONGS'}
            </Typography>
        )}

        <List sx={{ maxHeight: '42vh', overflowY: 'auto', pr: 0.5, '&::-webkit-scrollbar': { width: '5px' }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(247, 140, 160, 0.3)', borderRadius: '3px' } }}>
          {results.map((song) => {
            const imageUrl = song.album.images?.[0]?.url || '';
            const artists = song.artists.map(artist => artist.name).join(', ') || 'Unknown Artist';
            return (
              <ListItem
                key={song.id}
                secondaryAction={
                  <IconButton edge="end" aria-label="play" onClick={() => handleSelect(song)} sx={{ 
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, #f78ca0 0%, #f9748f 100%)',
                    width: '38px',
                    height: '38px',
                    boxShadow: '0 4px 12px rgba(247, 140, 160, 0.4)',
                    transition: 'all 0.2s ease',
                    '&:hover': { 
                      background: 'linear-gradient(135deg, #ff9a9e 0%, #f78ca0 100%)',
                      transform: 'scale(1.1)' 
                    } 
                  }}>
                      <PlayArrow sx={{ fontSize: '20px' }} />
                  </IconButton>
                }
                sx={{
                  mb: 1,
                  borderRadius: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  transition: 'all 0.25s ease-in-out',
                  padding: '8px 12px',
                  '&:hover': {
                    backgroundColor: 'rgba(247, 140, 160, 0.12)',
                    borderColor: 'rgba(247, 140, 160, 0.35)',
                    transform: 'translateX(3px)',
                  },
                }}
              >
                <ListItemAvatar>
                  <Avatar variant="rounded" src={imageUrl} sx={{ width: 46, height: 46, borderRadius: '12px', border: '1.5px solid rgba(247, 140, 160, 0.4)' }} />
                </ListItemAvatar>
                <ListItemText
                  primaryTypographyProps={{ style: { fontWeight: '600', fontSize: '0.92rem', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }}
                  primary={song.name}
                  secondary={<span style={{ color: 'rgba(255, 215, 230, 0.65)', fontSize: '0.8rem' }}>{artists}</span>}
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