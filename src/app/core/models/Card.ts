import { SafeHtml } from "@angular/platform-browser";

export interface CardApplesData {
    name?: string;
    checked?: boolean;
}

export class Card {
    id?: string;
    location?: string;
    iframe?: SafeHtml;
    driver?: string;
    start?: string;
    end?: string;
    comments?: string;
    link?: string;
    applesData: CardApplesData[];
    revision?: boolean;
    revisionComplete?: boolean;
    numberTerritory?: number;
    completed?: number;
    territory?: string;
    name?: string;
    title?: string;
    territoryNumber?: number;
    creation?: any; // Timestamp or string
    
    constructor(){
        this.applesData = [{name:'', checked: false}]
    }
}