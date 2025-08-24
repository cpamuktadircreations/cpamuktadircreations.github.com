import React, { useState, useEffect } from 'react';
import { Container, Button, TextField, Typography, Card, CardMedia } from '@mui/material';

const API = '/api';

function App() {
  const [token, setToken] = useState('');
  const [offers, setOffers] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => { fetchOffers(); fetchGallery(); }, []);

  const fetchOffers = async () => {
    const res = await fetch(`${API}/offers`);
    setOffers(await res.json());
  };

  const fetchGallery = async () => {
    const res = await fetch(`${API}/gallery`);
    setGallery(await res.json());
  };

  // Authentication, actions, admin panel, payment, etc. omitted for brevity. 

  return (
    <Container>
      <Typography variant="h4">CPA Action Portal</Typography>
      {/* Offers List */}
      <Typography variant="h5">Available Offers</Typography>
      <div>
        {offers.map(o => (
          <Card key={o._id}>
            <Typography variant="h6">{o.title}</Typography>
            <Typography>{o.description}</Typography>
            <Typography>${o.payout}</Typography>
            {o.image && (
              <CardMedia
                component="img"
                height="140"
                image={`/uploads/${o.image}`}
                alt={o.title}
              />
            )}
            <Button href={o.url} target="_blank">Go to Offer</Button>
            <Button onClick={() => {/* complete offer */}}>Mark as Completed</Button>
          </Card>
        ))}
      </div>
      {/* Photo Gallery */}
      <Typography variant="h5">Offer Gallery</Typography>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {gallery.map((img, idx) => (
          <img
            key={idx}
            src={`/uploads/${img}`}
            alt="Gallery"
            style={{ width: 120, margin: 5, borderRadius: 8 }}
          />
        ))}
      </div>
      {/* Admin Panel, Analytics, Payment, etc. */}
    </Container>
  );
}

export default App;