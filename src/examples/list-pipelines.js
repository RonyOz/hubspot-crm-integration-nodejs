'use strict';

const { getDealPipelines } = require('../services/hubSpotService');

async function listDealPipelines() {
  try {
    const pipelines = await getDealPipelines();
    pipelines.forEach((pipeline) => {
      console.log(`Pipeline: ${pipeline.label} (id: ${pipeline.id})`);
      pipeline.stages.forEach((stage) => {
        console.log(`  Stage: ${stage.label} (id: ${stage.id})`);
      });
    });
  } catch (error) {
    console.error('Failed to list pipelines:', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  listDealPipelines();
}

module.exports = { listDealPipelines };
