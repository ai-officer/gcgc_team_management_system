          <Card key={task.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <CheckSquare className={`w-5 h-5 ${task.isOverdue ? 'text-red-500' : 'text-blue-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                        <span className="truncate">{task.title}</span>
                        {task.isOverdue && (
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                      </h3>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                      )}
                      
                      {/* Status and Priority Badges */}
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge className={getStatusColor(task.status)}>
                          {getStatusIcon(task.status)}
                          <span className="ml-1">{task.status}</span>
                        </Badge>
                        {task.priority && (
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                        )}
                        <Badge variant="outline" className="bg-gray-50">
                          {task.taskType}
                        </Badge>
                        {task.dueDate && (
                          <Badge variant={task.isOverdue ? "destructive" : "outline"}>
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedTask(task)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{task.title}</DialogTitle>
                        <DialogDescription>
                          Task details and user relationships
                        </DialogDescription>
                      </DialogHeader>
                      {selectedTask && (
                        <div className="space-y-6">
                          {/* Task Info */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold mb-2">Task Information</h4>
                              <div className="space-y-2 text-sm">
                                <div><strong>Status:</strong> {selectedTask.status}</div>
                                <div><strong>Priority:</strong> {selectedTask.priority}</div>
                                <div><strong>Type:</strong> {selectedTask.taskType}</div>
                                {selectedTask.dueDate && (
                                  <div><strong>Due Date:</strong> {new Date(selectedTask.dueDate).toLocaleDateString()}</div>
                                )}
                                <div><strong>Created:</strong> {new Date(selectedTask.createdAt).toLocaleDateString()}</div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">Involvement</h4>
                              <div className="space-y-2 text-sm">
                                <div><strong>Users Involved:</strong> {selectedTask.involvedUserCount}</div>
                                <div><strong>Collaborators:</strong> {selectedTask._count.collaborators}</div>
                                <div><strong>Comments:</strong> {selectedTask._count.comments}</div>
                                {selectedTask.team && (
                                  <div><strong>Team:</strong> {selectedTask.team.name}</div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Description */}
                          {selectedTask.description && (
                            <div>
                              <h4 className="font-semibold mb-2">Description</h4>
                              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{selectedTask.description}</p>
                            </div>
                          )}

                          {/* All Involved Users */}
                          <div>
                            <h4 className="font-semibold mb-3">All Involved Users</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {selectedTask.allInvolvedUsers.map((user) => (
                                <div key={`${user.id}-${user.relationship}`} className="flex items-center space-x-3 p-3 border rounded-lg">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>
                                      {user.name ? user.name.split(' ').map(n => n[0]).join('') : <User className="w-4 h-4" />}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{user.name}</div>
                                    <div className="text-xs text-gray-500 truncate">{user.email}</div>
                                  </div>
                                  <div className="flex flex-col items-end space-y-1">
                                    <Badge size="sm" className={getRoleColor(user.role)}>
                                      {user.role}
                                    </Badge>
                                    <Badge size="sm" variant="outline">
                                      {user.relationship}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Recent Comments */}
                          {selectedTask.comments && selectedTask.comments.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-3">Recent Comments</h4>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {selectedTask.comments.map((comment) => (
                                  <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="font-medium text-sm">{comment.user.name}</span>
                                      <span className="text-xs text-gray-500">
                                        {new Date(comment.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700">{comment.content}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {/* User relationships summary */}
              <div className="space-y-3">
                {/* Assigned To */}
                {task.assignedTo && (
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-600">Assigned to:</span>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {task.assignedTo.name ? task.assignedTo.name.split(' ').map(n => n[0]).join('') : 'A'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{task.assignedTo.name}</span>
                      <Badge size="sm" className={getRoleColor(task.assignedTo.role)}>
                        {task.assignedTo.role}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Created By */}
                {task.createdBy && (
                  <div className="flex items-center space-x-2">
                    <UserPlus className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600">Created by:</span>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {task.createdBy.name ? task.createdBy.name.split(' ').map(n => n[0]).join('') : 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{task.createdBy.name}</span>
                      <Badge size="sm" className={getRoleColor(task.createdBy.role)}>
                        {task.createdBy.role}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Collaborators */}
                {task.collaborators && task.collaborators.length > 0 && (
                  <div className="flex items-start space-x-2">
                    <Users className="w-4 h-4 text-purple-600 mt-1" />
                    <div className="flex-1">
                      <span className="text-sm text-gray-600">Collaborators ({task.collaborators.length}):</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {task.collaborators.slice(0, 3).map((collab) => (
                          <div key={collab.user.id} className="flex items-center space-x-1 bg-gray-100 rounded-full px-2 py-1">
                            <Avatar className="h-4 w-4">
                              <AvatarFallback className="text-xs">
                                {collab.user.name ? collab.user.name.split(' ').map(n => n[0]).join('') : 'C'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium">{collab.user.name}</span>
                          </div>
                        ))}
                        {task.collaborators.length > 3 && (
                          <span className="text-xs text-gray-500 self-center">
                            +{task.collaborators.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Team */}
                {task.team && (
                  <div className="flex items-center space-x-2">
                    <GitBranch className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-gray-600">Team:</span>
                    <Badge variant="outline">
                      <Users className="w-3 h-3 mr-1" />
                      {task.team.name}
                    </Badge>
                  </div>
                )}

                {/* Task Stats */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    {task._count.comments > 0 && (
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{task._count.comments} comments</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{task.involvedUserCount} users involved</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Updated {new Date(task.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>