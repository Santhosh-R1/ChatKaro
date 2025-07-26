import React, { useState } from 'react';
import axios from 'axios'; // We use the global axiosInstance from Chat.js
import axiosInstance from "../../../BaseUrl";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  IconButton,
  Box,
  CircularProgress
} from '@mui/material';
import { PlayArrow } from '@mui/icons-material';

// Consistent styling for the dialog
const dialogSx = {
  "& .MuiDialog-paper": {
    width: '90%',
    maxWidth: '500px',
    background: "rgba(30, 30, 45, 0.8)",
    backdropFilter: "blur(15px)",
    "-webkit-backdrop-filter": "blur(15px)",
    boxShadow: "0 8px 32px 0 rgba(0, 0,0, 0.37)",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: "15px",
    color: "#f1f1f1",
  },
};

function MusicSearchModal({ open, onClose, onSongSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResults([]);
    setError(null);

    try {
      // --- THIS IS THE CORRECTED PART ---
      // We now call our own backend, which will safely call the Deezer API.
      const response = await axiosInstance.get(`/api/music/search?q=${encodeURIComponent(query)}`);
      
      if (response.data.length === 0) {
        setError("No songs found for your search.");
      }
      // The backend now sends the array of songs directly.
      setResults(response.data);

    } catch (err) {
      console.error("Error fetching music:", err);
      setError("Could not fetch music. Please try again.");
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
      <DialogTitle sx={{ pb: 1 }}>Share a Song</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Search for a song or artist..."
            type="text"
            fullWidth
            variant="outlined"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{
                input: { color: '#f1f1f1' },
                label: { color: '#b1b3b5' },
                '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#b1b3b5' },
                    '&:hover fieldset': { borderColor: 'white' },
                },
            }}
          />
          <Button type="submit" variant="contained" disabled={loading} sx={{ height: '55px', alignSelf: 'center' }}>
            Search
          </Button>
        </Box>

        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress color="inherit" /></Box>}
        
        {error && !loading && <p style={{ textAlign: 'center', color: '#ff7b7b' }}>{error}</p>}

        <List sx={{ maxHeight: '40vh', overflowY: 'auto' }}>
          {results.map((song) => (
            <ListItem
              key={song.id}
              secondaryAction={
                <IconButton edge="end" aria-label="play" onClick={() => handleSelect(song)}>
                  <PlayArrow sx={{ color: '#1DB954', '&:hover': { color: '#1ed760' } }} />
                </IconButton>
              }
              sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }, borderRadius: '8px', my: 0.5 }}
            >
              <ListItemAvatar>
                <Avatar variant="rounded" src={song.album.cover_small} />
              </ListItemAvatar>
              <ListItemText 
                primary={song.title_short} 
                secondary={<span style={{color: '#b1b3b5'}}>{song.artist.name}</span>} 
              />
            </ListItem>
          ))}
        </List>
        
        {results.length > 0 && (
          <p style={{ fontSize: '0.75rem', textAlign: 'center', color: '#999', marginTop: '1rem' }}>
            Music previews are 30-second clips provided by Deezer.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default MusicSearchModal;