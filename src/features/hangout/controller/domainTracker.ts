import { Part1Domain, getPart1Question } from '../prompts/part1';

export function hasRemainingQuestions(domain: Part1Domain, usedIds: Set<string>): boolean {
    return !!getPart1Question(domain, usedIds);
}
