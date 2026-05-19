const fs = require('fs');
const file = 'src/app/modules/departures/components/form-edit-departures/form-edit-departures.component.ts';
let content = fs.readFileSync(file, 'utf8');

const replacement = `
    const departures = this.formDepartureDataInput();
    if (departures.length > 0) {
      this.initForm(departures);
    }

    this.loadAllTerritoryCompletionData(data);
  }

  async loadAllTerritoryCompletionData(data: any) {
    const promises = [];
    for (const loc of this.localities) {
      if (loc.hasNumberedTerritories) {
        const rawData = data[loc.key] || [];
        const territories = rawData.filter((t: any) => t && typeof t === 'object' && t.collection && t.territorio);
        if (territories.length > 0) {
          promises.push(this.loadTerritoryCompletionData(loc, territories));
        }
      }
    }
    await Promise.all(promises);
  }

  async loadTerritoryCompletionData(loc: any, territories: any[]) {
    const locationPrefix = loc.territoryPrefix;
    if (!this.territoryLastCompletedDays[locationPrefix]) {
      this.territoryLastCompletedDays[locationPrefix] = {};
    }

    const path = loc.key;
    const suffix = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, '');
    
    const storageKeys = [\`statisticData\${suffix}_6\`, \`statisticData\${suffix}_12\`, \`statisticData\${suffix}_24\`];
    for (const key of storageKeys) {
      const cachedData = sessionStorage.getItem(key);
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          parsedData.forEach((territoryCards: any[]) => {
            if (territoryCards && territoryCards.length > 0) {
              const primaryCard = territoryCards[0];
              const num = primaryCard.numberTerritory || primaryCard.territory;
              if (num !== undefined) {
                let lastEnd = null;
                for (let i = 0; i < 6 && i < territoryCards.length; i++) {
                  if (territoryCards[i].end) {
                    lastEnd = territoryCards[i].end;
                    break;
                  }
                }
                if (lastEnd) {
                  const today = new Date();
                  const dateToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  let dateCard: Date;
                  if (typeof lastEnd === 'string' || typeof lastEnd === 'number') {
                    dateCard = new Date(lastEnd);
                  } else if (lastEnd && typeof (lastEnd as any).toDate === 'function') {
                    dateCard = (lastEnd as any).toDate();
                  } else if (lastEnd && typeof (lastEnd as any).seconds === 'number') {
                    dateCard = new Date((lastEnd as any).seconds * 1000);
                  } else {
                    dateCard = new Date(lastEnd);
                  }

                  if (!isNaN(dateCard.getTime())) {
                    const difference = Math.abs(dateCard.getTime() - dateToday.getTime());
                    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                    this.territoryLastCompletedDays[locationPrefix][num] = days;
                  } else {
                    this.territoryLastCompletedDays[locationPrefix][num] = Infinity;
                  }
                } else {
                  this.territoryLastCompletedDays[locationPrefix][num] = Infinity;
                }
              }
            }
          });
          return;
        } catch (e) {}
      }
    }

    const promises = territories.map((t: any) =>
      new Promise<void>((resolve) => {
        this.territoryDataService.getCardTerritorie(t.collection, 120).pipe(take(1)).subscribe(cards => {
          let lastEnd = null;
          for (const c of cards) {
            if (c.end) {
              lastEnd = c.end;
              break;
            }
          }
          if (lastEnd) {
            const today = new Date();
            const dateToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            let dateCard: Date;
            if (typeof lastEnd === 'string' || typeof lastEnd === 'number') {
              dateCard = new Date(lastEnd);
            } else if (lastEnd && typeof (lastEnd as any).toDate === 'function') {
              dateCard = (lastEnd as any).toDate();
            } else if (lastEnd && typeof (lastEnd as any).seconds === 'number') {
              dateCard = new Date((lastEnd as any).seconds * 1000);
            } else {
              dateCard = new Date(lastEnd);
            }

            if (!isNaN(dateCard.getTime())) {
              const difference = Math.abs(dateCard.getTime() - dateToday.getTime());
              const days = Math.floor(difference / (1000 * 60 * 60 * 24));
              this.territoryLastCompletedDays[locationPrefix][t.territorio] = days;
            } else {
              this.territoryLastCompletedDays[locationPrefix][t.territorio] = Infinity;
            }
          } else {
            this.territoryLastCompletedDays[locationPrefix][t.territorio] = Infinity;
          }
          resolve();
        });
      })
    );
    await Promise.all(promises);
  }
`;

const lines = content.split('\\n');
const insertIndex = lines.findIndex(line => line.includes('loadDrivers() {'));

if (insertIndex !== -1) {
    // Find the end of processTerritoryData, which is the brace right before loadDrivers
    let endIndex = insertIndex - 1;
    while(endIndex > 0 && lines[endIndex].trim() === '') {
        endIndex--;
    }
    
    // endIndex should be the '}' closing processTerritoryData
    if (lines[endIndex].trim() === '}') {
        let i = endIndex - 1;
        while(i > 0) {
            if (lines[i].includes('this.initForm(departures);')) {
                // Remove everything from the initForm call to the closing brace
                lines.splice(i - 1, endIndex - i + 2, replacement);
                fs.writeFileSync(file, lines.join('\\n'));
                console.log('Success');
                break;
            }
            i--;
        }
    }
} else {
    console.log('loadDrivers not found');
}
