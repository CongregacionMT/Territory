import { SafeHtml } from "@angular/platform-browser";

interface CardapplesData {
    name?: string;
    checked?: boolean;
}

export class Card {
    id?: number;
    location?: string;
    numberTerritory?: number;
    iframe?: SafeHtml;
    driver?: string;
    start?: string;
    end?: string;
    comments?: string;
    link?: string;
    applesData: CardapplesData[];
    revision?: boolean;
    revisionComplete?: boolean;
    constructor(){
        this.applesData = [{name:'', checked: false}]
    }
}