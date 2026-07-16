import { useState } from 'react';
import { TypingExercise } from '../components/TypingExercise';
import type { Drill } from '../engine/drills';
import type { Hint } from '../engine/hints';
import { getTodos, removeTodo, type StoredTodo } from '../storage/localStore';
import { TestPage } from './TestPage';

interface Props {
  onSessionSaved: () => void;
  onDrill: (hint: Hint) => void;
}

export function TodosPage({ onSessionSaved, onDrill }: Props) {
  const [todos, setTodos] = useState<StoredTodo[]>(getTodos);
  const [active, setActive] = useState<StoredTodo | null>(null);

  const remove = (id: string) => {
    removeTodo(id);
    setTodos((items) => items.filter((item) => item.id !== id));
  };

  const exit = () => {
    setActive(null);
    setTodos(getTodos());
  };

  if (active?.kind === 'test') {
    return (
      <TestPage
        key={active.id}
        initialTodo={active}
        onExit={exit}
        onDrill={onDrill}
        onSessionSaved={onSessionSaved}
      />
    );
  }

  if (active) {
    const drill: Drill = {
      label: active.label,
      description: active.description,
      words: active.words,
    };
    return (
      <div className="page">
        <TypingExercise
          drill={drill}
          kind={active.kind}
          onExit={exit}
          onSessionSaved={onSessionSaved}
        />
      </div>
    );
  }

  return (
    <div className="page todos-page">
      <section>
        <h2>todos</h2>
        <p className="sub">
          Exercises you want to repeat. They stay here until you are satisfied with the result.
        </p>
      </section>

      {todos.length === 0 ? (
        <div className="todo-empty">
          <h3>nothing queued</h3>
          <p className="sub">
            Complete a test or training exercise, then choose “add exercise to todos”.
          </p>
        </div>
      ) : (
        <div className="todo-list">
          {todos.map((todo) => (
            <article className="todo-item" key={todo.id}>
              <div className="todo-body">
                <div className="todo-meta">
                  <span className={`badge badge-${todo.kind}`}>{todo.kind}</span>
                  <span>{todo.kind === 'test' ? 'same test text' : `${todo.words.length} words`}</span>
                </div>
                <h3>{todo.label}</h3>
                <p className="sub">{todo.description}</p>
              </div>
              <div className="todo-actions">
                <button className="btn" onClick={() => setActive(todo)}>
                  start
                </button>
                <button
                  className="btn btn-quiet"
                  onClick={() => remove(todo.id)}
                  aria-label={`Remove ${todo.label} from todos`}
                >
                  satisfied
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
