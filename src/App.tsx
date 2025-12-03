import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Modal,
  Paper,
  Stack,
  Container,
} from "@mui/material";

interface BoxData {
  id: number;
  title: string;
  price: number;
}

const boxes: BoxData[] = [
  { id: 1, title: "Box 1", price: 99.99 },
  { id: 2, title: "Box 2", price: 149.99 },
  { id: 3, title: "Box 3", price: 199.99 },
];

function App() {
  const [openModal, setOpenModal] = useState<number | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);

  const handleCashOut = (price: number) => {
    setSelectedPrice(price);
    setOpenModal(price);
  };

  const handleCloseModal = () => {
    setOpenModal(null);
    setSelectedPrice(null);
  };

  const handleContinue = () => {
    if (selectedPrice !== null) {
      alert(`$${selectedPrice.toFixed(2)}`);
      handleCloseModal();
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
                onClick={() => handleCashOut(box.price)}
              >
                Cash out
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
