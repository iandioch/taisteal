const stringForHours = (hours:number):string => {
    // TODO: this, and number-to-km-string calc, should be moved to a common lib.
    if (hours === 1) {
        return "1 hour";
    }
    if (hours < 18) {
        return `${hours} hours`;
    }
    const days = Math.ceil(hours / 24.0);
    if (days < 50) {
        return `${days} days`;
    }
    const weeks = Math.ceil(hours / (24.0 * 7));
    if (weeks < 50) {
        return `${weeks} weeks`;
    }
    //const years = (hours / (24.0 * 365)).toFixed(1);
    const years = Math.max(Math.round(hours / (24.0 * 365)), 1);
    const remainingHours = hours - (years * 24 * 365);
    console.log("removing remainingHours " + remainingHours + " from years " + years);
    if (remainingHours > 100) {
        return `${years} years ${stringForHours(remainingHours)}`;
    }
    return `${years} years`;
}

export { stringForHours };
