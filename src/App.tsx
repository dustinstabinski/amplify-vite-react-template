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
  "87f973b1-16cf-4898-afce-893ed40cdd45": { min: 48, max: 52 },
  "739c42bd-43c7-4746-9b36-985b1fd38a69": { min: -10, max: 50 },
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
  finalAmount: number | null;
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
  const x = Math.sin(seed) * 1000;
  return x - Math.floor(x);
}

// Generate a random number between min and max using a seed (with decimals)
function generateSeededRandom(seed: number, min: number, max: number): number {
  const random = seededRandom(seed);
  const value = random * (max - min) + min;
  // Round to 2 decimal places for currency
  return Math.round(value * 100) / 100;
}

function mapCurrencyToBox(currency: Schema["Currency"]["type"]): BoxData {
  // Generate history for the last 10 days (today + previous 9 days)
  const range = CURRENCY_RANGES[currency.id] || { min: 0, max: 50 };
  const history: HistoryEntry[] = [];

  for (let daysAgo = 0; daysAgo < 10; daysAgo++) {
    const dateString = getRelativeDateString(daysAgo);
    // Combine currency ID with date string for unique hash per currency
    const hashInput = `${currency.id}-${dateString}`;
    const dateHash = hashString(hashInput);
    const price = generateSeededRandom(dateHash, range.min, range.max);
    history.push({ date: dateString, price });
  }

  const price = history[0]?.price ?? 0;

  return {
    id: currency.id,
    title:
      currency.name && currency.name.trim().length > 0
        ? currency.name
        : "Untitled",
    price,
    cashedOut: Boolean(currency.cashedOut),
    finalAmount: currency.finalAmount ?? null,
    history,
  };
}

function App() {
  const [boxes, setBoxes] = useState<BoxData[]>([]);
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [historyBoxId, setHistoryBoxId] = useState<string | null>(null);
  const [warningStep, setWarningStep] = useState<number>(1);

  useEffect(() => {
    async function loadCurrencies() {
      const { data } = await client.models.Currency.list();

      // Just map currencies; prices and history are derived on the fly
      setBoxes(data.map(mapCurrencyToBox));
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
    setWarningStep(1);
  };

  const handleContinue = async () => {
    if (selectedBoxId !== null) {
      const box = boxes.find((b) => b.id === selectedBoxId);
      if (box) {
        // Persist cashedOut and finalAmount in the backend
        await client.models.Currency.update({
          id: selectedBoxId,
          cashedOut: true,
          finalAmount: box.price,
        });

        // Update the cashedOut status and finalAmount locally
        setBoxes((prevBoxes) =>
          prevBoxes.map((b) =>
            b.id === selectedBoxId
              ? { ...b, cashedOut: true, finalAmount: box.price }
              : b
          )
        );
        handleCloseModal();
      }
    }
  };

  const getWarningMessage = (currencyName?: string) => {
    switch (warningStep) {
      case 1:
        return currencyName
          ? `Are you sure you want to cash out your ${currencyName}?`
          : "Are you sure you want to cash out?";
      case 2:
        return "Are you actually Bobbi?";
      case 3:
        return "Are you sure because if not Bobbi has the right to hunt you down?";
      case 4:
      default:
        return "Ok last warning. You sure?";
    }
  };

  const handleContinueClick = async () => {
    if (warningStep < 4) {
      setWarningStep((prev) => prev + 1);
      return;
    }
    await handleContinue();
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
    <Container sx={{ py: 4, height: '100%', overflow: 'auto' }}>
      <Box sx={{ textAlign: "center", mb: 4, display: "flex", flexDirection: 'column' }}>
        <Typography variant="h3" component="h3" sx={{ mb: 2 }}>
          bobbi's birthday gift 2025
        </Typography>
        <Typography variant="h5" component="h5" sx={{ maxWidth: "800px", mx: "auto" }}>
          You have been gifted undisclosed amounts of three different currencies. Every day, the conversion from the currency to $USD changes based on the market. It is up to you when you'd like to cash out, but once you do there's no going back. You can continue to check the conversions even after you cash out to see how badly you fucked up. Good luck
        </Typography>
      </Box>
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
                {box.cashedOut && box.finalAmount !== null
                  ? `Cashed out $${box.finalAmount.toFixed(2)}`
                  : "Cash out"}
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
            p: 4,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            width: { xs: "90%", sm: "400px" },
            maxWidth: "500px",
          }}
        >
          <Typography id="cash-out-modal" variant="h6" component="h2">
            Confirm Cash Out
          </Typography>
          <Typography id="cash-out-modal-description">
            {getWarningMessage(
              boxes.find((b) => b.id === selectedBoxId)?.title
            )}
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
            <Button variant="outlined" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleContinueClick}>
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
            width: { xs: "90%", sm: "400px" },
            maxWidth: "500px",
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
