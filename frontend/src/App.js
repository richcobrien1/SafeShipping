// src/App.js
import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Box,
  Chip,
} from "@mui/material";
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

export default function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/logs/v2u-core/ledger.ndjson")
      .then((res) => res.text())
      .then((data) => {
        const parsed = data
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line));
        setEvents(parsed.reverse()); // newest first
      })
      .catch((err) => console.error("❌ Failed to fetch logs", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        <LocalShippingIcon sx={{ mb: "-6px", mr: 1 }} />
        SafeShipping Log Dashboard
      </Typography>

      <Paper elevation={3} sx={{ mt: 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={6}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>⏱️ Timestamp</TableCell>
                <TableCell>📦 Event</TableCell>
                <TableCell>🧾 Tracking ID</TableCell>
                <TableCell>📍 Location</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map((e, i) => (
                <TableRow key={i}>
                  <TableCell>{e["@timestamp"] || "—"}</TableCell>
                  <TableCell>
                    <Chip
                      label={e.event}
                      color={e.event.includes("failed") ? "error" : "primary"}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{e.tracking_id || "—"}</TableCell>
                  <TableCell>{e.location || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Container>
  );
}
