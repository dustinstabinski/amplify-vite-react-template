import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Modal,
  Paper,
  Stack,
  Container,
} from "@mui/material";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

interface BoxData {
  id: string;
  title: string;
  price: number;
  cashedOut: boolean;
}

function mapCurrencyToBox(currency: Schema["Currency"]["type"]): BoxData {
  const rawData = (currency.data ?? []) as unknown;
  let price = 0;

  if (Array.isArray(rawData) && rawData.length > 0) {
    const first = rawData[0] as { price?: unknown };
    if (typeof first?.price === "number") {
      price = first.price;
    }
  }

  return {
    id: currency.id,
    title: currency.name && currency.name.trim().length > 0 ? currency.name : "Untitled",
    price,
    cashedOut: Boolean(currency.cashedOut),
  };
}

function App() {
  const [boxes, setBoxes] = useState<BoxData[]>([]);
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);

  useEffect(() => {
    async function loadCurrencies() {
      const { data } = await client.models.Currency.list()
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

  const handleViewHistory = () => {
    alert("History");
  };

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
                onClick={handleViewHistory}
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
    </Container>
  );
}

export default App;
