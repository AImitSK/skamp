// src/__mocks__/react-dnd.ts
// Mock for react-dnd library

export const useDrag = jest.fn(() => [{}, jest.fn(), jest.fn()]);
export const useDrop = jest.fn(() => [{ isOver: false, canDrop: false }, jest.fn()]);
export const DndProvider = ({ children }: any) => children;
export const DragPreviewImage = () => null;
