const RubiksCube = require('../../models/RubiksCube')
const BaseSolver = require('./BaseSolver')
const utils = require('../../utils')

const R = (moves) => RubiksCube.reverseMoves(moves)

class case1Solver extends BaseSolver {
  solve({ corner, edge }) {
    let caseNum = this._getCaseNumber({ corner, edge })
    this[`_solveCase${caseNum}`]({ corner, edge })
  }

  /**
   * 9 Cases:
   * 1) Pair is matched.
   * 2) Pair is separated.
   *
   * ---- Group 1: Corner's white color is on DOWN face ----
   * 3) Corner and edge share a face and colors on that face are equal.
   * 4) Corner and edge share a face and colors on that face are not equal.
   * 5) Corner and edge do not share a face.
   *
   * ---- Group 2: Corner's "other" color matches edge's "primary" color ----
   * 6) Corner shares a face with edge.
   * 7) Corner does not share a face with edge.
   *
   * ---- Group 3: Corner's "other" color doesn't match edge's "primary" color ----
   * 8) Corner shares a face with edge.
   * 9) Corner does not share a face with edge.
   *
   * TODO: refactor
   */
  _getCaseNumber({ corner, edge }) {
    if (corner.faces().includes('DOWN')) {
      return this._getGroup1Case({ corner, edge })
    }

    let primaryColor = edge.colors().find(color => {
      return edge.getFaceOfColor(color) !== 'DOWN'
    })
    let otherColor = corner.colors().find(color => {
      return color !== 'U' && corner.getFaceOfColor(color) !== 'DOWN'
    })

    if (primaryColor === otherColor) {
      return this._getGroup2Case({ corner, edge })
    } else {
      return this._getGroup3Case({ corner, edge })
    }
  }

  _getGroup1Case({ corner, edge }) {
    let sharedFace = false
    for (let face of edge.faces()) {
      if (corner.faces().includes(face)) {
        sharedFace = face
        break
      }
    }

    if (sharedFace) {
      if (corner.getColorOfFace(sharedFace) === edge.getColorOfFace(sharedFace)) {
        return 1
      } else {
        return 2
      }
    }

    let edgePrimaryColor = edge.colors().filter(color => edge.getFaceOfColor(color) !== 'DOWN')
    let faces = corner.faces().filter(face => face !== 'DOWN')

    let cornerRightColor
    if (utils.getFaceFromDirection(faces[0], 'RIGHT', { UP: 'UP' }) === faces[1]) {
      cornerRightColor = faces[1]
    } else if (utils.getFaceFromDirection(faces[1], 'RIGHT', { UP: 'UP' }) === faces[0]) {
      cornerRightColor = faces[0]
    }

    if (cornerRightColor === edgePrimaryColor) {
      return 3
    } else {
      return 4
    }
  }

  _getGroup2Case({ corner, edge }) {
    if (this.isPairMatched({ corner, edge })) {
      return 5
    }

    // corner and edge share a face
    if (corner.faces().includes(edge.faces().find(face => face !== 'DOWN'))) {
      return 6
    } else {
      return 7
    }
  }

  _getGroup3Case({ corner, edge }) {
    if (this.isPairSeparated({ corner, edge })) {
      return 8
    }

    // corner and edge share a face
    if (corner.faces().includes(edge.faces().find(face => face !== 'DOWN'))) {
      return 9
    } else {
      return 10
    }
  }

  _solveCase1({ corner, edge }) {
    this.solveMatchedPair({ corner, edge })
  }

  _solveCase2({ corner, edge }) {
    this.solveSeparatedPair({ corner, edge })
  }

  _solveCase3({ corner, edge }) {
    // calculate which side the corner is on, the position, etc.
    let currentFace = edge.faces().find(face => face !== 'DOWN')
    let targetFace = utils.getMoveOfColor(edge.getColorOfFace('DOWN'))
    let prepFace = utils.getFaceFromDirection(targetFace, 'BACK', { DOWN: 'DOWN'})
    let otherFace = corner.faces().find(face => !edge.faces().includes(face))
    let isLeft = utils.getFaceFromDirection(targetFace, otherFace, { DOWN: 'DOWN' }) === 'LEFT'

    // the moves
    let prep = utils.getRotationFromTo('DOWN', currentFace, targetFace)
    let moveFace = utils.getMoveOfFace(otherFace)
    let dir = isLeft ? 'D' : 'DPrime'

    let solveMoves = `${prep} ${moveFace} ${moveFace} D D`
    solveMoves += `${moveFace} ${dir} ${R(moveFace)} ${dir} ${moveFace} ${moveFace}`
    this.move(solveMoves)
  }

  _solveCase4({ corner, edge }) {
    // calculate which side the corner is on, the position, etc.
    let currentFace = edge.faces().find(face => face !== 'DOWN')
    let targetFace = utils.getMoveOfColor(edge.getColorOfFace(currentFace))
    let otherFace = corner.faces().find(face => !edge.faces().includes(face))
    let isLeft = utils.getFaceFromDirection(otherFace, current, { DOWN: 'DOWN' }) === 'LEFT'

    // the moves
    let prep = utils.getRotationFromTo('DOWN', currentFace, targetFace)
    let moveFace = utils.getMoveOfFace(targetFace)
    moveFace = isLeft ? R(moveFace) : moveFace

    this.move(`${prep} ${moveFace} D D ${R(moveFace)}`)
    this.solveSeparatedPair({ corner, edge })
  }

  _solveCase5({ corner, edge }) {
    let primary = edge.colors().find(color => edge.getFaceOfColor(color) !== 'DOWN')
    let secondary = edge.colors().find(color => edge.getFaceOfColor(color) === 'DOWN')

    let isLeft = utils.getFaceFromDirection(
      utils.getMoveOfFace(edge.getFaceOfColor(primary)),
      utils.getMoveOfFace(edge.getFaceOfColor(secondary)),
      { DOWN: 'DOWN' }
    ) === 'RIGHT'

    let edgeCurrent = edge.getFaceOfColor(primary)
    let edgeTarget = utils.getFaceOfMove(primary)

    // do the prep move now. need to calculate things after this move is done
    let edgePrep = utils.getRotationFromTo('DOWN', edgeCurrent, edgeTarget)
    this.move(edgePrep)

    // calculate corner stuff
    let cornerCurrent = corner.getFaceOfColor(primary)
    let cornerTarget = edgeTarget

    // the moves
    let cornerPrep = utils.getRotationFromTo('DOWN', cornerCurrent, cornerTarget)
    let open = isLeft ? R(edgeTarget) : edgeTarget
    let dir = isLeft ? 'DPrime' : 'D'

    this.move(`${open} ${cornerPrep} ${dir} ${R(open)}`)
    this.solveMatchedPair({ corner, edge })
  }

  _solveCase6({ corner, edge }) {
    let primary = edge.colors().find(color => edge.getFaceOfColor(color) !== 'DOWN')

    let currentFace = edge.getFaceOfColor(primary)
    let targetFace = utils.getFaceOfMove(edge.getColorOfFace('DOWN'))
    let isLeft = utils.getDirectionFromFaces(
      corner.getFaceOfColor(primary),
      currentFace,
      { DOWN: 'DOWN' }
    ) === 'LEFT'

    let prep = utils.getRotationFromTo('DOWN', currentFace, targetFace)
    let moveFace = isLeft ? R(targetFace) : targetFace
    let dir = isLeft ? 'D' : 'DPrime'

    this.move(`${prep} ${moveFace} ${dir} ${R(moveFace)}`)
    this.solveSeparatedPair({ corner, edge})
  }

  _solveCase7({ corner, edge }) {
    let primary = edge.colors().find(c => edge.getFaceOfColor(c) !== 'DOWN')
    let cornerCurrent = corner.getFaceOfColor('U')
    let cornerTarget = utils.getFaceOfMove(primary)
    let isLeft = utils.getDirectionFromFaces(
      corner.getFaceOfColor(primary),
      corner.getFaceOfColor('U'),
      { DOWN: 'DOWN' }
    ) === 'LEFT'

    let cornerPrep = utils.getRotationFromTo('DOWN', cornerCurrent, cornerTarget)
    this.move(cornerPrep)

    let edgeCurrent = edge.getFaceOfColor(primary)
    let edgeTarget = corner.getFaceOfColor(primary)

    let edgeMatch = utils.getRotationFromTo('DOWN', edgeCurrent, edgeTarget)
    let open = isLeft ? corner.getFaceOfColor(primary) : R(corner.getFaceOfColor(primary))
    this.move(`${open} ${edgeMatch}`)

    this.solveMatchedPair({ corner, edge })
  }

  _solveCase8({ corner, edge }) {
    let primary = edge.colors().find(c => edge.getFaceOfColor(c) !== 'DOWN')
    let currentFace = corner.getFaceOfColor(
      edge.colors().find(c => !['U', primary].includes(c))
    )
    let targetFace = utils.getFaceOfMove(primary)
    let isLeft = utils.getDirectionFromFaces(
      currentFace,
      corner.getFaceOfColor('U'),
      { DOWN: 'DOWN' }
    )

    let prep = utils.getRotationFromTo('DOWN', currentFace, targetFace)
    let open = isLeft ? R(targetFace) : targetFace
    let dir = isLeft ? 'D' : 'DPrime'

    this.move(`${prep} ${open} ${dir} ${R(open)}`)
    this.solveSeparatedPair({ corner, edge })
  }

  _solveCase9({ corner, edge }) {
    let primary = edge.colors().find(c => edge.getFaceOfColor(c) !== 'DOWN')
    let secondary = edge.colors().find(c => edge.getFaceOfColor(c) === 'DOWN')
    let cornerCurrent = edge.getFaceOfColor('U')
    let cornerTarget = utils.getFaceOfMove(secondary)
    let isLeft = utils.getDirectionFromFaces(
      corner.getFaceOfColor(primary),
      corner.getFaceOfColor('U'),
      { DOWN: 'DOWN' }
    )

    let cornerPrep = utils.getRotationFromTo('DOWN', cornerCurrent, cornerTarget)
    this.move(cornerPrep)

    let edgeCurrent = edge.getFaceOfColor(primary)
    let edgeTarget = utils.getFaceOfMove(primary)

    let open = isLeft ? cornerTarget : R(cornerTarget)
    let edgePrep = utils.getRotationFromTo('DOWN', edgeCurrent, edgeTarget)

    this.move(`${open} ${edgePrep}`)
    this.solveSeparatedPair({ corner, edge })
  }
}

module.exports = case1Solver
