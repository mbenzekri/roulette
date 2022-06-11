import crypto from "crypto"
import fs from 'fs'
const fdg = fs.openSync('./output/games.csv', "w")
const fdr = fs.openSync('./output/result.csv', "w")
fs.writeSync(fdg, `strategie;session;tirage;pot;mise;gain;numero;zero;pair;impair;manque;passe;rouge;noir;colonne;douzaine;jeu\n`)
fs.writeSync(fdr, `strategie;session;nbtirage;gain;pot;max\n`)

const MAXTIRAGE = 150
const POTINITIAL = 200
const PLEINS = Array.from(Array(37).keys())
const COLONNES = Array.from(Array(3).keys())
const DOUZAINES = Array.from(Array(3).keys())
const NOIRS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]
const ROUGES = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]

function tireNumero() {
    return crypto.randomBytes(1).at(0) % 37
}

function sessionTirages(nbtirage = MAXTIRAGE) {
    return Array.from(new Array(nbtirage)).map(_ => tireNumero())
}

/**
 * shuffle an array
 * @param {any[]} array 
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array
}

/** 
 *  @typedef Tirage
 *  @type {object}
 *  @property {string} id - an ID.
 * 
 */


/** 
 *  Permet de définir les mises pour un lancé
 *  @property {number[]} pleins - mises sur les numeros
 *  @property {string} pair - mises sur pair
 *  @property {string} impair - mises sur impair
 *  @property {string} passe - mises sur passe
 *  @property {string} manque - mises sur manque
 *  @property {string} noir - mises sur noir
 *  @property {string} rouge - mises sur rouge
 *  @property {string} douzaines - mises sur les douzaine de 0..2
 *  @property {string} colonnes - mises sur les colonnes de 0..2
 *  @property {string} stop - true pour terminer ma partie
 */

class Jeu {
    pleins = PLEINS.map(_ => 0)
    pair = 0
    impair = 0
    passe = 0
    manque = 0
    noir = 0
    rouge = 0
    douzaines = [0, 0, 0]
    colonnes = [0, 0, 0]
    stop = false

    /**
     * mise sur un numero plein
     * @param {number} numero 
     * @param {number} jetons - nombre de jetons
     */
    misePlein(numero, jetons) { this.pleins[numero] += jetons }
    /**
     * mise sur pair
     * @param {number} jetons - nombre de jetons
     */
    misePair(jetons) { this.pair += jetons }
    /**
     * mise sur impair
     * @param {number} jetons - nombre de jetons
     */
    miseImpair(jetons) { this.impair += jetons }
    /**
     * mise sur passe
     * @param {number} jetons - nombre de jetons
     */
    misPasse(jetons) { this.passe += jetons }
    /**
     * mise sur manque
     * @param {number} jetons - nombre de jetons
     */
    miseManque(jetons) { this.manque += jetons }
    /**
     * mise sur noir
     * @param {number} jetons - nombre de jetons
     */
    miseNoir(jetons) { this.noir += jetons }
    /**
     * mise sur rouge
     * @param {number} jetons - nombre de jetons
     */
    miseRouge(jetons) { this.rouge += jetons }
    /**
     * mise sur une colonne
     * @param {number} colonne de 0=1ere col, 1=2eme col, 2=3eme col
     * @param {number} jetons - nombre de jetons
     */
    miseColonne(colonne, jetons) { this.colonnes[colonne] += jetons }
    /**
     * mise sur une douzaine
     * @param {number} douzaine de 0=1ere dz, 1=2eme dz, 2=3eme dz
     * @param {number} jetons - nombre de jetons
     */
    miseDouzaine(douzaine, jetons) { this.douzaines[douzaine] += jetons }

    /**
     * recupère la mise total
     */
    get mise() {
        const total = (this.pair + this.impair + this.passe + this.manque + this.noir + this.rouge
            + this.pleins.reduce((total, jetons) => total + jetons, 0)
            + this.douzaines.reduce((total, jetons) => total + jetons, 0)
            + this.colonnes.reduce((total, jetons) => total + jetons, 0))
        return total
    }

    /**
     * multiplie la mise par un coefficient entier
     * @param {number} coeff 
     */
    multiply(coeff) {
        this.pleins.forEach((jetons, numero) => this.pleins[numero] = coeff * jetons)
        this.douzaines.forEach((jetons, douzaine) => this.douzaines[douzaine] = coeff * jetons)
        this.colonnes.forEach((jetons, col) => this.colonnes[col] = coeff * jetons)
        this.pair = this.pair * coeff
        this.impair = this.impair * coeff
        this.passe = this.passe * coeff
        this.manque = this.manque * coeff
        this.noir = this.noir * coeff
        this.rouge = this.rouge * coeff
    }

    /**
     * calcul le gain de cette mise pour un tirage
     * @param {Tirage} tirage 
     */
    gain(tirage) {
        const gpleins = this.pleins[tirage.numero] * 36
        const gdouzaines = tirage.zero ? 0 : this.douzaines[tirage.douzaine] * 3
        const gcolonnes = tirage.zero ? 0 : this.colonnes[tirage.colonne] * 3
        const gpair = tirage.pair ? this.pair * 2 : 0
        const gimpair = tirage.impair ? this.impair * 2 : 0
        const gpasse = tirage.passe ? this.passe * 2 : 0
        const gmanque = tirage.manque ? this.manque * 2 : 0
        const gnoir = tirage.noir ? this.noir * 2 : 0
        const grouge = tirage.rouge ? this.rouge * 2 : 0
        const total = gpleins + gdouzaines + gcolonnes + gpair + gimpair + gpasse + gmanque + gnoir + grouge
        return total
    }
    /** formate la mise pour présentation */
    format() {
        const list = []
        this.pair && list.push(`pair:${this.pair}`)
        this.impair && list.push(`impair:${this.impair}`)
        this.passe && list.push(`passe:${this.passe}`)
        this.manque && list.push(`manque:${this.manque}`)
        this.noir && list.push(`noir:${this.noir}`)
        this.rouge && list.push(`rouge:${this.rouge}`)
        this.pleins.forEach((mise, numero) => (mise > 0) && list.push(`${numero}:${mise}`))
        this.douzaines.forEach((mise, dz) => (mise > 0) && list.push(`dz${dz + 1}:${mise}`))
        this.colonnes.forEach((mise, col) => (mise > 0) && list.push(`col${col + 1}:${mise}`))
        return list.join(',')
    }

}
class Strategie {
    init(session) {
        // initialiser le jeu
    }
    jeu(session) {
        // doit retourner un objet Jeu precisant les mise pour le lancé a venir
        // ici un jeton sur 1 numero aleatoire
        const jeu = new Jeu()
        if (session.balance > 0) jeu.misePlein(tireNumero(), 1)
        else jeu.stop = true
        return jeu
    }
}

// jouer à chaque lancé
// - 1 jeton sur colonne 1 
// - 1 jeton sur colonne 2
class S2CStatic extends Strategie {
    jeu(session) {
        const jeu = new Jeu()
        if (session.balance >= 2) {
            // si j'ai deux jetons je les joue sur les colonnes non sortie la fois précedente
            jeu.miseColonne(0, 1)
            jeu.miseColonne(1, 1)
        } else {
            jeu.stop = true
        }
        return jeu
    }
}

// - 1 jeton sur colonne 1 
// - 1 jeton sur colonne 2
// - 0.5 jeton sur numero 0,3,12,15,30,33
class S2C6NStatic extends Strategie {
    jeu(session) {
        const jeu = new Jeu()
        if (session.balance >= 13) {
            // si j'ai deux jetons je les joue sur les colonnes non sortie la fois précedente
            jeu.miseColonne(0, 5)
            jeu.miseColonne(1, 5)
            jeu.misePlein(0, 0.5)
            jeu.misePlein(3, 0.5)
            jeu.misePlein(12, 0.5)
            jeu.misePlein(15, 0.5)
            jeu.misePlein(30, 0.5)
            jeu.misePlein(33, 0.5)
        } else {
            jeu.stop = true
        }
        return jeu
    }
}

// - 1 jeton sur colonne 1 
// - 1 jeton sur colonne 2
// - 0.5 jeton sur numero 0,3,12,15,30,33 
// + martingale x2 x3 x4 en cas de gain si pot respectivement >50, >100, > 200
class S2C6NStaticMart extends S2CStatic {
    jeu(session) {
        let jeu = new Jeu()
        if (session.balance >= 350) {
            jeu.stop = true
            return jeu
        }
        const last = session.last
        const prev = session.previous
        const pprev = session.prevPrevious
        jeu.miseColonne(0, 7)
        jeu.miseColonne(1, 7)
        jeu.misePlein(0, 0.5)
        jeu.misePlein(3, 0.5)
        jeu.misePlein(12, 0.5)
        jeu.misePlein(15, 0.5)
        jeu.misePlein(30, 0.5)
        jeu.misePlein(33, 0.5)
        if (session.balance >= jeu.mise) {
            // si j'ai deux jetons je les joue sur les colonnes non sortie la fois précedente
            if (session.balance >= 200 && last && last.gain > 0 && prev && prev.gain > 0 && pprev && pprev.gain > 0 && session.balance >= (4 * jeu.mise)) {
                jeu.multiply(4)
                return jeu
            }
            if (session.balance >= 100 && last && last.gain > 0 && prev && prev.gain > 0 && session.balance >= (3 * jeu.mise)) {
                jeu.multiply(3)
                return jeu
            }
            if (session.balance >= 50 && last && last.gain > 0 && session.balance >= (2 * jeu.mise)) {
                jeu.multiply(2)
                return jeu
            }
        } else {
            return super.jeu(session)
        }
        return jeu
    }
}

// jouer 1 jeton sur chaque colonne non sorti la fois précédente
class S2CNotLast extends S2CStatic {
    jeu(session) {
        const tirage = session.last
        if (!tirage || tirage.zero || session.balance < 2) return super.jeu(session)
        const jeu = new Jeu()
        COLONNES.forEach(col => (tirage.colonne !== col) && jeu.miseColonne(col, 1))
        return jeu
    }
}

class SMourad1 extends Strategie {
    numeros = []
    firstwin = false
    /**
     * @param {Session} session - 
     */
    init(session) {
        const list = PLEINS.filter(numero => !session.before.includes(numero))
        this.numeros = shuffleArray(list).concat(shuffleArray(session.before.map(x=>x))).slice(0,3)
    }
    /**
     * @param {Session} session 
     */
    jeu(session) {
        const jeu = new Jeu()
        let nbperte = 0
        let firstwin = false
        for(let i = session.tirages.length - 1;i>=0;i--) {
            if (session.tirages[i].gain == 0) nbperte++
            else {
                this.firstwin = true
                break
            }
        }
        if (this.firstwin) {
            if (nbperte > 9) nbperte = 0
            for(let i = Math.min(nbperte+1,10);i>0;i--) {
                const mise = this.numeros.length * i
                if (mise < session.balance) {
                    this.numeros.forEach(numero => jeu.misePlein(numero,i))
                    break
                }
            }    
        } else {
            if (this.numeros.length < session.balance) {
                this.numeros.forEach(numero => jeu.misePlein(numero,1))
            }
        }
        if (jeu.mise <= 0) jeu.stop = true
        return jeu
    }

}

// jouer 1 jeton sur chaque colonne non sorti la fois précédente
// de plus la mise est sur les gains (balance > initial) on ajoute 1 jeton par colonne
class S2CNotLastDoubleGain extends S2CNotLast {
    jeu(session) {
        const jeu = super.jeu(session)
        if ((session.balance - jeu.mise) >= 2 && (session.balance > (session.initial / 2))) {
            COLONNES.forEach(col => (jeu.colonnes[col] !== 0) && jeu.miseColonne(col, 1))
        }
        return jeu
    }
}

class S2CNotLastMultiplyGain {
    jeu(session) {
        const jeu = new Jeu()
        if (session.balance >= 2) {
            // si j'ai deux jetons je les joue sur les colonnes non sortie la fois précedente
            // je mise deux jetons si possible quand ma balance est au dessus de mon pot initial (je prend plus de risque avec des gains)
            const tirage = session.last
            if (tirage && !tirage.zero) {
                const percentwin = Math.floor((session.balance - session.initial) * 100 / session.initial)
                const mise = (percentwin >= 20) ? 4 : (percentwin >= 10) ? 3 : (percentwin >= 5) ? 2 : 1
                COLONNES.forEach(col => (tirage.colonne !== col) && jeu.miseColonne(col, mise))
            } else {
                jeu.miseColonne(0, 1)
                jeu.miseColonne(1, 1)
            }
        } else {
            jeu.stop = true
        }
        return jeu
    }
}

class S2CNotLastMultiplyGainAndZero {
    jeu(session) {
        const jeu = new Jeu()
        if (session.balance >= 2) {
            // si j'ai deux jetons je les joue sur les colonnes non sortie la fois précedente
            // je mise deux jetons si possible quand ma balance est au dessus de mon pot initial (je prend plus de risque avec des gains)
            const tirage = session.last
            if (tirage && !tirage.zero) {
                const percentwin = Math.floor((session.balance - session.initial) * 100 / session.initial)
                const mise = (percentwin >= 40) ? 8 : (percentwin >= 30) ? 6 : (percentwin >= 20) ? 4 : (percentwin >= 10) ? 3 : (percentwin >= 5) ? 2 : 1
                if (mise > 2) jeu.misePlein(0, 1)
                COLONNES.forEach(col => (tirage.colonne !== col) && jeu.miseColonne(col, mise))
            } else {
                jeu.miseColonne(0, 1)
                jeu.miseColonne(1, 1)
            }
        } else {
            jeu.stop = true
        }
        return jeu
    }
}
class S2CNotLastMultiplyGainAndZeroRetire {
    jeu(session) {
        const jeu = new Jeu()
        const percentwin = Math.floor((session.balance - session.initial) * 100 / session.initial)
        if (percentwin > 50) {
            // retire 25% des gains
            const jetons = Math.floor(session.initial * 0.25)
            session.retire(jetons)
        }
        if (session.balance >= 2) {
            // si j'ai deux jetons je les joue sur les colonnes non sortie la fois précedente
            // je mise deux jetons si possible quand ma balance est au dessus de mon pot initial (je prend plus de risque avec des gains)
            const tirage = session.last
            if (tirage && !tirage.zero) {
                const mise = (percentwin >= 40) ? 8 : (percentwin >= 30) ? 6 : (percentwin >= 20) ? 4 : (percentwin >= 10) ? 3 : (percentwin >= 5) ? 2 : 1
                if (mise > 2) jeu.misePlein(0, 1)
                COLONNES.forEach(col => (tirage.colonne !== col) && jeu.miseColonne(col, mise))
            } else {
                jeu.miseColonne(0, 1)
                jeu.miseColonne(1, 1)
            }
        } else {
            jeu.stop = true
        }
        return jeu
    }
}


/**
 * @property { number } nosession -  numeros sortis avant
 * @property { Strategie } strategie -  numeros sortis avant
 * @property { number[] } numeros -  numeros sortis avant
 * @property { number[] } before -  numeros sortis avant
 * @property { number } balance -  nombre de jetons à jouer (le pot)
 * @property { number } initial -  nombre de jetons à jouer initial
 * @property { number } maxBalance -  valeur max du pot au cours du jeu
 * @property { Tirage[] } tirages -  Tirages successif 
 * @property { number } lance -  nombre lancé de tirage
 * @property { number } gain -  nombre de jetons retirés (non jouable)
 */
class Session {

    /**
     * initialise the Session object
     * @param {Strategie} strategie 
     * @param {number} nosession 
     * @param {number[]} numeros 
     * @param {number[]} before 
     */
    constructor(strategie, nosession, numeros, before) {
        this.nosession = nosession
        this.strategie = strategie
        this.numeros = numeros
        this.before = before
        this.balance = POTINITIAL
        this.initial = POTINITIAL
        this.maxBalance = POTINITIAL
        this.tirages = []
        this.lance = 0
        this.gain = 0
    }

    /** 
     * fais un tirage 
     * @param {number} numero 
     */
    tirage(numero) {
        const lance = this.tirages.length + 1
        const zero = (numero === 0)
        const pair = zero ? false : ((numero % 2) === 0)
        const impair = zero ? false : pair
        const manque = zero ? false : (numero <= 18)
        const passe = zero ? false : manque
        const noir = NOIRS.includes(numero)
        const rouge = ROUGES.includes(numero)
        const colonne = zero ? null : ((numero - 1) % 3)
        const douzaine = zero ? null : Math.floor((numero - 1) / 12)
        const tirage = { lance, numero, zero, pair, impair, manque, passe, rouge, noir, colonne, douzaine }
        this.tirages.push(tirage)
        return tirage
    }

    // retourne le dernier tirage
    get last() {
        return this.tirages.length ? this.tirages[this.tirages.length - 1] : null
    }
    // retourne le tirage precedent le dernier tirage
    get previous() {
        return (this.tirages.length > 2) ? this.tirages[this.tirages.length - 2] : null
    }
    // retourne le tirage precedent le dernier tirage
    get prevPrevious() {
        return (this.tirages.length > 3) ? this.tirages[this.tirages.length - 3] : null
    }

    // retire les gains en jeton 
    retire(jetons = this.balance) {
        if (jetons > this.balance) jetons = this.balance
        this.balance -= jetons
        this.gain += jetons
    }

    play() {
        this.lance = 0
        //console.log(`Session start => pot=${this.balance} `)
        this.strategie.init(this)
        for (let i = 0; i < this.numeros.length && this.balance > 0; i++) {
            this.lance++
            const jeu = this.strategie.jeu(this)
            if (jeu.stop) break
            const numero = this.numeros[i]
            const mise = jeu.mise
            if (mise > this.balance)
                throw Error(`lancé=${lance} => Jeu superieur à la balance ${jeu.mise} > ${this.balance}`)
            const tirage = this.tirage(numero)
            tirage.balance = this.balance
            tirage.mise = mise

            this.balance -= mise
            const gain = jeu.gain(tirage)
            this.balance += gain
            tirage.gain = gain

            fs.writeSync(fdg, `${this.format(tirage, jeu)}\n`)
            if (this.balance > this.maxBalance) this.maxBalance = this.balance
        }

    }
    format(tirage, jeu) {
        const outlist = [
            this.strategie.constructor.name,
            this.nosession,
            tirage.lance,
            tirage.balance,
            tirage.mise,
            tirage.gain,
            tirage.numero,
            tirage.zero,
            tirage.pair,
            tirage.impair,
            tirage.manque,
            tirage.passe,
            tirage.rouge,
            tirage.noir,
            tirage.colonne + 1,
            tirage.douzaine + 1,
            jeu.format()
        ]
        return outlist.join(';')
    }
}

const STRATEGIES = {
    S2CStatic,
    S2CNotLast,
    //S2CNotLastDoubleGain, 
    S2C6NStatic,
    S2C6NStaticMart,
    SMourad1,
    // S2CNotLastMultiplyGain,  
    // S2CNotLastMultiplyGainAndZero,
    // S2CNotLastMultiplyGainAndZeroRetire
}

for (let i = 0; i < 1000; i++) {
    const numeros = sessionTirages()
    const before = sessionTirages(50)
    for (const classname in STRATEGIES) {
        const strategie = new STRATEGIES[classname]()
        const session = new Session(strategie, i + 1, numeros, before)
        session.play()
        fs.writeSync(fdr, `${classname};${i + 1};${session.lance};${session.gain};${session.balance};${session.maxBalance}\n`)
    }
    if ((i % 100) == 0) console.log(`playing session ${i}`)
}

fs.closeSync(fdg)
fs.closeSync(fdr)

