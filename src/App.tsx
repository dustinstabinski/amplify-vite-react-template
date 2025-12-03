import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Modal,
  Paper,
  Stack,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

// Currency ID to price range mapping
const CURRENCY_RANGES: Record<string, { min: number; max: number }> = {
  "87f973b1-16cf-4898-afce-893ed40cdd45": { min: 0, max: 50 },
  "739c42bd-43c7-4746-9b36-985b1fd38a69": { min: 0, max: 50 },
  "e8fe1d84-27dd-4045-aa78-704ce03cfb5c": { min: 0, max: 50 },
};

interface HistoryEntry {
  date: string;
  price: number;
}

interface BoxData {
  id: string;
  title: string;
  price: number;
  cashedOut: boolean;
  history: HistoryEntry[];
}

// Format a date as month-day-year
function formatDate(d: Date): string {
  const month = d.getMonth() + 1; // getMonth() returns 0-11
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month}-${day}-${year}`;
}

// Get a date string for N days ago
function getRelativeDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return formatDate(d);
}

// Simple hash function to convert string to number
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Seeded random number generator
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate a random number between min and max using a seed
function generateSeededRandom(seed: number, min: number, max: number): number {
  const random = seededRandom(seed);
  return Math.floor(random * (max - min + 1)) + min;
}

function mapCurrencyToBox(currency: Schema["Currency"]["type"]): BoxData {
  const rawData = (currency.data ?? []) as unknown;
  const dataArray = Array.isArray(rawData) ? rawData : [];

  const history: HistoryEntry[] = dataArray.map((entry, index) => {
    const e = entry as { price?: unknown };
    const price =
      typeof e.price === "number"
        ? e.price
        : 0;

    // Today for index 0, yesterday for index 1, etc.
    const date = getRelativeDateString(index);

    return { date, price };
  });

  const price = history.length > 0 ? history[0].price : 0;

  return {
    id: currency.id,
    title:
      currency.name && currency.name.trim().length > 0
        ? currency.name
        : "Untitled",
    price,
    cashedOut: Boolean(currency.cashedOut),
    history,
  };
}

function App() {
  const [boxes, setBoxes] = useState<BoxData[]>([]);
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [historyBoxId, setHistoryBoxId] = useState<string | null>(null);

  useEffect(() => {
    async function loadCurrencies() {
      const { data } = await client.models.Currency.list();
      
      // Process each currency to ensure we have backfilled prices for the past 10 days
      const updatedCurrencies = await Promise.all(
        data.map(async (currency) => {
          // Get the price range for this currency (default to 0-50)
          const range = CURRENCY_RANGES[currency.id] || { min: 0, max: 50 };

          // Build a backfilled array for the last 10 days (today + previous 9 days)
          const backfilledData: Array<{ date: string; price: number }> = [];
          for (let daysAgo = 0; daysAgo < 10; daysAgo++) {
            const dateString = getRelativeDateString(daysAgo);
            const dateHash = hashString(dateString);
            const price = generateSeededRandom(dateHash, range.min, range.max);
            backfilledData.push({ date: dateString, price });
          }

          // Update the currency in the database with the backfilled data
          await client.models.Currency.update({
            id: currency.id,
            data: backfilledData as unknown as Record<string, unknown>,
          });

          // Return updated currency for mapping
          return {
            ...currency,
            data: backfilledData as unknown as Record<string, unknown>,
          };
        })
      );
      
      setBoxes(updatedCurrencies.map(mapCurrencyToBox));
    }

    void loadCurrencies();
  }, []);

  const handleCashOut = (boxId: string) => {
    const box = boxes.find((b) => b.id === boxId);
    if (box && !box.cashedOut) {
      setSelectedBoxId(boxId);
      setOpenModal(boxId);
    }
  };

  const handleCloseModal = () => {
    setOpenModal(null);
    setSelectedBoxId(null);
  };

  const handleContinue = async () => {
    if (selectedBoxId !== null) {
      const box = boxes.find((b) => b.id === selectedBoxId);
      if (box) {
        alert(`$${box.price.toFixed(2)}`);
        // Persist cashedOut in the backend
        await client.models.Currency.update({
          id: selectedBoxId,
          cashedOut: true,
        });

        // Update the cashedOut status locally
        setBoxes((prevBoxes) =>
          prevBoxes.map((b) =>
            b.id === selectedBoxId ? { ...b, cashedOut: true } : b
          )
        );
        handleCloseModal();
      }
    }
  };

  const handleViewHistory = (boxId: string) => {
    setHistoryBoxId(boxId);
  };

  const handleCloseHistory = () => {
    setHistoryBoxId(null);
  };

  const selectedHistoryBox =
    historyBoxId !== null
      ? boxes.find((b) => b.id === historyBoxId) ?? null
      : null;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={4}>
        <Box
          sx={{
            display: "flex",
            gap: 3,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {boxes.map((box) => (
            <Paper
              key={box.id}
              elevation={3}
              sx={{
                p: 3,
                minWidth: 250,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <Typography variant="h5" component="h2">
                {box.title}
              </Typography>
              <Typography variant="h6" color="primary">
                ${box.price.toFixed(2)}
              </Typography>
              <Button
                variant="contained"
                onClick={() => handleCashOut(box.id)}
                disabled={box.cashedOut}
              >
                {box.cashedOut ? "Cashed out" : "Cash out"}
              </Button>
              <Button
                variant="outlined"
                onClick={() => handleViewHistory(box.id)}
              >
                View History
              </Button>
            </Paper>
          ))}
        </Box>
      </Stack>

      <Modal
        open={openModal !== null}
        onClose={handleCloseModal}
        aria-labelledby="cash-out-modal"
        aria-describedby="cash-out-modal-description"
      >
        <Paper
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            p: 4,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Typography id="cash-out-modal" variant="h6" component="h2">
            Confirm Cash Out
          </Typography>
          <Typography id="cash-out-modal-description">
            Are you sure you want to cash out?
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
            <Button variant="outlined" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleContinue}>
              Continue
            </Button>
          </Box>
        </Paper>
      </Modal>

      <Modal
        open={historyBoxId !== null}
        onClose={handleCloseHistory}
        aria-labelledby="history-modal"
        aria-describedby="history-modal-description"
      >
        <Paper
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 500,
            p: 4,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Typography id="history-modal" variant="h6" component="h2">
            {selectedHistoryBox?.title ?? "History"}
          </Typography>
          <Typography id="history-modal-description">
            Price history by date
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Price</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedHistoryBox?.history.map((entry) => (
                  <TableRow key={entry.date}>
                    <TableCell>{entry.date}</TableCell>
                    <TableCell align="right">
                      ${entry.price.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
            <Button variant="outlined" onClick={handleCloseHistory}>
              Close
            </Button>
          </Box>
        </Paper>
      </Modal>
    </Container>
  );
}

export default App;
