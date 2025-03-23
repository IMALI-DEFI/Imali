import React from "react";
import IMALIToken from "./components/Token";
import Lending from "./components/Lending";
import Staking from "./components/Staking";
import YieldFarming from "./components/YieldFarming";
import PresaleSection from "./components/PresaleSection";
import NFTMinting from "./components/NFTMinting";
import DAODashboard from "./components/DAODashboard";
import { Grid, Paper, Typography } from "@mui/material";
import MetaMaskMobilePrompt from "./components/MetaMaskMobilePrompt";

const App = () => {
  return (
    <section className="bg-gray-100 min-h-screen py-16 px-6">
      <Paper className="container mx-auto max-w-6xl bg-white shadow-lg p-12 rounded-lg">
        <Typography variant="h4" align="center" className="mb-8" style={{ color: "#036302", fontWeight: "bold" }}>
          🚀 IMALI Ecosystem
        </Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <IMALIToken />
          </Grid>
          <Grid item xs={12} md={6}>
            <Lending />
          </Grid>
          <Grid item xs={12} md={6}>
            <Staking />
          </Grid>
          <Grid item xs={12} md={6}>
            <YieldFarming />
          </Grid>
          <Grid item xs={12} md={6}>
            <PresaleSection />
          </Grid>
          <Grid item xs={12} md={6}>
            <NFTMinting />
          </Grid>
          <Grid item xs={12} md={6}>
            <DAODashboard />
          </Grid>
        </Grid>
      </Paper>
    </section>
  );
};


export default App;
